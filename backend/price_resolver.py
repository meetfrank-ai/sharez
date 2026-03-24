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

    # Look up instrument mapping
    mapping = db.query(InstrumentMap).filter(InstrumentMap.ee_name == stock_name).first()

    if not mapping:
        # Try fuzzy match
        mapping = _fuzzy_match(db, stock_name)

    eodhd_symbol = mapping.eodhd_symbol if mapping else None
    yf_symbol = mapping.yfinance_symbol if mapping else None
    inst_type = mapping.instrument_type if mapping else instrument_type
    scrape_source = mapping.scrape_source if mapping else None
    scrape_code = mapping.scrape_code if mapping else None

    # Source 1: EODHD
    if eodhd_symbol:
        price = _fetch_eodhd(eodhd_symbol)
        if price and _sanity_check(price, avg_buy_price, inst_type):
            return {"price": price, "source": "eodhd", "confidence": "high"}
        elif price:
            _log_anomaly(db, stock_name, "eodhd", price, avg_buy_price)

    # Source 2: yfinance
    if yf_symbol:
        price = _fetch_yfinance(yf_symbol)
        if price and _sanity_check(price, avg_buy_price, inst_type):
            return {"price": price, "source": "yfinance", "confidence": "high"}
        elif price:
            _log_anomaly(db, stock_name, "yfinance", price, avg_buy_price)

    # Source 3: Scraped NAV cache
    if scrape_code or scrape_source:
        code = scrape_code or stock_name
        scraped = (
            db.query(ScrapedPrice)
            .filter(ScrapedPrice.instrument_code == code)
            .order_by(ScrapedPrice.nav_date.desc())
            .first()
        )
        if scraped and scraped.nav_price:
            age_hours = (datetime.now(timezone.utc) - scraped.scraped_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
            confidence = "medium" if age_hours < 48 else "low"
            if _sanity_check(scraped.nav_price, avg_buy_price, inst_type):
                return {"price": scraped.nav_price, "source": "scrape", "confidence": confidence}

    # No price available
    return {"price": None, "source": "none", "confidence": "none"}


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
