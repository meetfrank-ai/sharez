#!/usr/bin/env python
"""
Daily cron job: scrape NAVs, backfill historical prices, refresh all holdings.
"""
import logging
import time
from database import SessionLocal
from nav_scraper import scrape_and_store_for_holdings
from ee_import import _auto_map_instruments, _refresh_holdings_prices
from models import User, Holding, UserTransaction, InstrumentMap

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def backfill_historical_prices(db):
    """For holdings missing external_avg_buy_price, fetch historical prices."""
    from price_resolver import resolve_historical_price

    holdings = db.query(Holding).filter(Holding.external_avg_buy_price.is_(None)).all()
    if not holdings:
        logger.info("No holdings need historical price backfill")
        return

    logger.info(f"Backfilling historical prices for {len(holdings)} holdings...")
    filled = 0

    for h in holdings:
        mapping = db.query(InstrumentMap).filter(InstrumentMap.ee_name == h.stock_name).first()
        if not mapping or not mapping.eodhd_symbol:
            continue

        # Get buy transactions for this holding
        txs = db.query(UserTransaction).filter(
            UserTransaction.user_id == h.user_id,
            UserTransaction.stock_name == h.stock_name,
            UserTransaction.action == 'buy',
        ).all()

        if not txs:
            continue

        total_weighted = 0
        total_amount = 0
        resolved = 0

        for tx in txs:
            if not tx.transaction_date or not tx.amount:
                continue
            result = resolve_historical_price(
                db, mapping.eodhd_symbol, tx.transaction_date,
                yf_symbol=mapping.yfinance_symbol,
            )
            if result["price"]:
                total_weighted += tx.amount * result["price"]
                total_amount += tx.amount
                resolved += 1
            time.sleep(0.1)  # Rate limit

        if total_amount > 0 and resolved > 0:
            h.external_avg_buy_price = round(total_weighted / total_amount, 4)
            filled += 1
            logger.info(f"Backfilled {h.stock_name}: ext_buy=R{h.external_avg_buy_price:.4f} ({resolved}/{len(txs)} trades)")

    db.flush()
    logger.info(f"Backfilled {filled} holdings with historical prices")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        # 1. Scrape fund NAV prices from ProfileData
        logger.info("Starting daily cron...")
        result = scrape_and_store_for_holdings(db)
        logger.info(f"Scrape result: {result}")

        # 2. Auto-map any unmapped instruments
        all_stock_names = [h[0] for h in db.query(Holding.stock_name).distinct().all() if h[0]]
        _auto_map_instruments(db, all_stock_names)

        # 3. Backfill historical prices for holdings missing external_avg_buy_price
        backfill_historical_prices(db)

        # 4. Refresh current prices for all users
        users = db.query(User).all()
        for user in users:
            holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
            if holdings:
                try:
                    _refresh_holdings_prices(db, user)
                    logger.info(f"Refreshed prices for user {user.id} ({len(holdings)} holdings)")
                except Exception as e:
                    logger.warning(f"Price refresh failed for user {user.id}: {e}")

        # 5. Evaluate price alerts (fires Notifications on crossing).
        try:
            from routes.alerts import evaluate_alerts
            alert_result = evaluate_alerts(db)
            logger.info(f"Alert evaluation: {alert_result}")
        except Exception as e:
            logger.warning(f"Alert evaluation failed: {e}")

        # 6. Daily user-returns snapshot for the public Rank page.
        try:
            from services.returns import refresh_all
            returns_result = refresh_all(db)
            logger.info(f"Returns snapshot: {returns_result}")
        except Exception as e:
            logger.warning(f"Returns snapshot failed: {e}")

        # 7. Crystal Ball: lock picks for passed lockups, then refresh returns.
        try:
            from services.challenges import lock_picks_for_passed_lockups, refresh_participant_returns
            lock_result = lock_picks_for_passed_lockups(db)
            logger.info(f"Challenge pick-lock: {lock_result}")
            cb_result = refresh_participant_returns(db)
            logger.info(f"Challenge returns: {cb_result}")
        except Exception as e:
            logger.warning(f"Challenge cron failed: {e}")

        # 8. Cumulative portfolio % chart snapshots (D-14 — track-record surface).
        try:
            from services.portfolio_history import refresh_all_users
            ph_result = refresh_all_users(db)
            logger.info(f"Portfolio history: {ph_result}")
        except Exception as e:
            logger.warning(f"Portfolio history cron failed: {e}")

        logger.info("Daily cron complete.")
    except Exception as e:
        logger.error(f"Cron job failed: {e}", exc_info=True)
    finally:
        db.close()
