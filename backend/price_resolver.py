"""
Waterfall price resolver — tries multiple sources in order.
EODHD → yfinance → scraped NAV → null
Includes sanity check to reject impossible values.
"""

import os
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def resolve_price(db: Session, stock_name: str, avg_buy_price: float = None, instrument_type: str = "stock"):
    """
    Get the best available price for a holding.
    Returns: {price, source, confidence} or {price: None, source: "none", confidence: "none"}
    """
    from models import InstrumentMap, ScrapedPrice

    # Look up instrument mapping — EXACT match only for API sources.
    # Fuzzy matching caused wrong prices (e.g., partial name → wrong ticker).
    mapping = db.query(InstrumentMap).filter(InstrumentMap.ee_name == stock_name).first()

    inst_type = mapping.instrument_type if mapping else instrument_type

    # Source 1: EODHD (exact mapping required)
    if mapping and mapping.eodhd_symbol:
        price = _fetch_eodhd(mapping.eodhd_symbol)
        if price and _sanity_check(price, avg_buy_price, inst_type):
            return {"price": price, "source": "eodhd", "confidence": "high"}
        elif price:
            _log_anomaly(db, stock_name, "eodhd", price, avg_buy_price)

    # Source 2: yfinance (exact mapping required)
    if mapping and mapping.yfinance_symbol:
        price = _fetch_yfinance(mapping.yfinance_symbol)
        if price and _sanity_check(price, avg_buy_price, inst_type):
            return {"price": price, "source": "yfinance", "confidence": "high"}
        elif price:
            _log_anomaly(db, stock_name, "yfinance", price, avg_buy_price)

    # Source 3: Scraped NAV cache (ProfileData)
    # TEMPORARY: This source will be replaced with a professional data feed.
    from nav_scraper import match_holding_to_scraped
    scraped = match_holding_to_scraped(db, stock_name)
    if scraped and scraped.nav_price:
        age_hours = (datetime.now(timezone.utc) - scraped.scraped_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
        confidence = "medium" if age_hours < 48 else "low"
        # For unit trusts / funds: EE and ProfileData use different unit scales.
        # Return the NAV but flag that it can't be used to calculate current_value directly.
        # If no InstrumentMap exists and the match came from ProfileData (fund-only source),
        # assume it's a fund with potential unit scale mismatch.
        is_fund_type = inst_type in ("unit_trust", "ametf")
        if not mapping and not _sanity_check(scraped.nav_price, avg_buy_price, "unit_trust"):
            # No mapping + sanity fails = likely a fund with unit scale mismatch
            is_fund_type = True
        if is_fund_type:
            return {"price": scraped.nav_price, "source": "scrape", "confidence": confidence, "unit_mismatch": True}
        if _sanity_check(scraped.nav_price, avg_buy_price, inst_type):
            return {"price": scraped.nav_price, "source": "scrape", "confidence": confidence}
        else:
            _log_anomaly(db, stock_name, "scrape", scraped.nav_price, avg_buy_price)

    # No price available — log for visibility
    if not mapping:
        logger.info(f"No instrument mapping for '{stock_name}' — needs manual mapping")
    else:
        logger.info(f"No valid price found for '{stock_name}' from any source")
    return {"price": None, "source": "none", "confidence": "none"}


def resolve_historical_price(db: Session, symbol: str, target_date, yf_symbol: str = None):
    """
    Get the closing price for a symbol on a specific date.
    Checks cache first, then EODHD, then yfinance.
    Caches permanently (historical prices don't change).
    Returns: {price, source, date} or {price: None}
    """
    from models import HistoricalPrice

    if not symbol or not target_date:
        return {"price": None, "source": "none"}

    date_str = str(target_date)[:10]

    # 1. Check cache
    cached = db.query(HistoricalPrice).filter(
        HistoricalPrice.symbol == symbol,
        HistoricalPrice.price_date == date_str,
    ).first()
    if cached:
        return {"price": cached.close_price, "source": cached.source, "date": date_str, "cached": True}

    # 2. EODHD historical
    eodhd_key = os.getenv("EODHD_API_KEY")
    if eodhd_key:
        try:
            import httpx
            # Try exact date, then look back 5 days for weekends/holidays
            from_date = (datetime.strptime(date_str, "%Y-%m-%d") - timedelta(days=5)).strftime("%Y-%m-%d")
            resp = httpx.get(
                f"https://eodhd.com/api/eod/{symbol}",
                params={"api_token": eodhd_key, "fmt": "json", "from": from_date, "to": date_str, "order": "d"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    # Take the most recent entry (closest to target date)
                    close = data[0].get("close", 0)
                    actual_date = data[0].get("date", date_str)
                    if ".JSE" in symbol:
                        close = close / 100
                    price = round(close, 4)
                    # Cache permanently
                    try:
                        db.add(HistoricalPrice(symbol=symbol, price_date=date_str, close_price=price, source="eodhd"))
                        db.flush()
                    except Exception:
                        db.rollback()
                    logger.info(f"Historical {symbol} on {date_str}: R{price} [eodhd]")
                    return {"price": price, "source": "eodhd", "date": actual_date, "cached": False}
        except Exception as e:
            logger.warning(f"EODHD historical failed for {symbol} on {date_str}: {e}")

    # 3. yfinance fallback
    if yf_symbol:
        try:
            import yfinance as yf
            target = datetime.strptime(date_str, "%Y-%m-%d")
            start = target - timedelta(days=5)
            end = target + timedelta(days=1)
            ticker = yf.Ticker(yf_symbol)
            hist = ticker.history(start=start.strftime("%Y-%m-%d"), end=end.strftime("%Y-%m-%d"))
            if not hist.empty:
                close = hist["Close"].iloc[-1]
                currency = getattr(ticker, "info", {}).get("currency", "")
                if currency in ("ZAc", "ZAC"):
                    close = close / 100
                price = round(close, 4)
                try:
                    db.add(HistoricalPrice(symbol=symbol, price_date=date_str, close_price=price, source="yfinance"))
                    db.flush()
                except Exception:
                    db.rollback()
                logger.info(f"Historical {symbol} on {date_str}: R{price} [yfinance]")
                return {"price": price, "source": "yfinance", "date": date_str, "cached": False}
        except Exception as e:
            logger.warning(f"yfinance historical failed for {yf_symbol} on {date_str}: {e}")

    logger.info(f"No historical price for {symbol} on {date_str}")
    return {"price": None, "source": "none"}


def _fetch_eodhd(symbol):
    """Fetch latest price from EODHD."""
    eodhd_key = os.getenv("EODHD_API_KEY")
    if not eodhd_key:
        return None
    try:
        import httpx
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        resp = httpx.get(
            f"https://eodhd.com/api/eod/{symbol}",
            params={"api_token": eodhd_key, "fmt": "json", "from": start, "to": end, "order": "d"},
            timeout=10,
        )
        if resp.status_code == 200:
            eod = resp.json()
            if isinstance(eod, list) and len(eod) > 0:
                close = eod[0].get("close", 0)
                # JSE prices in cents
                if ".JSE" in symbol:
                    close = close / 100
                return round(close, 4)
    except Exception as e:
        logger.warning(f"EODHD failed for {symbol}: {e}")
    return None


def _fetch_yfinance(symbol):
    """Fetch latest price from yfinance."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        if price:
            # Check currency — yfinance is inconsistent for JSE
            currency = info.get("currency", "")
            if currency in ("ZAc", "ZAC"):
                price = price / 100
            return round(price, 4)
    except Exception as e:
        logger.warning(f"yfinance failed for {symbol}: {e}")
    return None


def _sanity_check(current_price, avg_buy_price, instrument_type):
    """Reject clearly wrong prices based on implied P&L."""
    if not avg_buy_price or avg_buy_price == 0:
        return True  # No reference price, accept anything
    if not current_price or current_price == 0:
        return False

    pnl_pct = abs((current_price - avg_buy_price) / avg_buy_price * 100)

    thresholds = {
        "unit_trust": 50,
        "ametf": 50,
        "etf": 60,
        "stock": 80,
    }
    threshold = thresholds.get(instrument_type, 80)
    return pnl_pct < threshold


def _log_anomaly(db, stock_name, source, returned_price, avg_buy_price):
    """Log a price that failed the sanity check."""
    from models import PriceAnomaly
    pnl = ((returned_price - avg_buy_price) / avg_buy_price * 100) if avg_buy_price else 0
    logger.warning(f"SANITY FAIL: {stock_name} from {source}: price={returned_price}, buy={avg_buy_price}, pnl={pnl:+.1f}%")
    try:
        db.add(PriceAnomaly(
            stock_name=stock_name, source=source, returned_price=returned_price,
            avg_buy_price=avg_buy_price, implied_pnl_pct=round(pnl, 2),
        ))
        db.commit()
    except Exception:
        db.rollback()


def _fuzzy_match(db, stock_name):
    """Try to find an instrument by partial name match."""
    from models import InstrumentMap

    # Exact
    result = db.query(InstrumentMap).filter(InstrumentMap.ee_name == stock_name).first()
    if result:
        return result

    # Contains (either direction)
    name_lower = stock_name.lower()
    all_maps = db.query(InstrumentMap).all()
    for m in all_maps:
        if name_lower in m.ee_name.lower() or m.ee_name.lower() in name_lower:
            return m

    # First significant word
    words = [w for w in name_lower.split() if len(w) > 3]
    for word in words:
        for m in all_maps:
            if word in m.ee_name.lower():
                return m

    return None
