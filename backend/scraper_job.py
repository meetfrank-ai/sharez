#!/usr/bin/env python
"""
Standalone NAV scraper + price refresh for Render cron job.
Runs daily: scrapes ProfileData fund prices, then refreshes all user holdings.
"""
import logging
from database import SessionLocal
from nav_scraper import scrape_and_store_for_holdings
from ee_import import _auto_map_instruments, _refresh_holdings_prices
from models import User, Holding

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    db = SessionLocal()
    try:
        # 1. Scrape fund NAV prices from ProfileData
        logger.info("Starting daily NAV scrape...")
        result = scrape_and_store_for_holdings(db)
        logger.info(f"Scrape result: {result}")

        # 2. Auto-map any unmapped instruments
        all_stock_names = [h[0] for h in db.query(Holding.stock_name).distinct().all() if h[0]]
        _auto_map_instruments(db, all_stock_names)

        # 3. Refresh prices for all users
        users = db.query(User).all()
        for user in users:
            holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
            if holdings:
                try:
                    _refresh_holdings_prices(db, user)
                    logger.info(f"Refreshed prices for user {user.id} ({len(holdings)} holdings)")
                except Exception as e:
                    logger.warning(f"Price refresh failed for user {user.id}: {e}")

        logger.info("Daily cron complete.")
    except Exception as e:
        logger.error(f"Cron job failed: {e}", exc_info=True)
    finally:
        db.close()
