"""
ProfileData NAV Scraper — TEMPORARY SOLUTION

Scrapes latest unit trust / fund NAV prices from ProfileData's ASISA Latest Prices page.
This is an interim solution until a professional data-feed setup is in place.
The long-term plan is to replace this with a licensed data provider.

Source: https://funds.profiledata.co.za/aci/ASISA/LatestPrices.aspx
"""

import re
import logging
from datetime import datetime, timezone
from io import BytesIO

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SOURCE_URL = "https://funds.profiledata.co.za/aci/ASISA/LatestPrices.aspx"


def scrape_latest_prices():
    """
    Scrape all fund prices from ProfileData.
    Returns list of dicts: {fund_name, target_market, nav, price_date}
    """
    import httpx

    try:
        resp = httpx.get(SOURCE_URL, timeout=30)
        if resp.status_code != 200:
            logger.error(f"ProfileData returned {resp.status_code}")
            return []

        html = resp.text
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)

        prices = []
        for row in rows:
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
            if len(cells) < 11:
                continue

            clean = [re.sub(r'<[^>]+>', '', c).strip().replace('&nbsp;', '') for c in cells]

            fund_name = clean[0]
            target_market = clean[2] if len(clean) > 2 else ''
            price_date_str = clean[9] if len(clean) > 9 else ''
            nav_str = clean[10] if len(clean) > 10 else ''

            # Parse NAV
            try:
                nav = float(nav_str.replace(',', ''))
            except (ValueError, TypeError):
                continue

            if nav <= 0:
                continue

            # Parse date (format: DD/MM/YY)
            price_date = None
            try:
                price_date = datetime.strptime(price_date_str, "%d/%m/%y")
            except (ValueError, TypeError):
                pass

            prices.append({
                'fund_name': fund_name,
                'target_market': target_market,
                'nav': nav,
                'price_date': price_date,
            })

        logger.info(f"Scraped {len(prices)} fund prices from ProfileData")
        return prices

    except Exception as e:
        logger.error(f"ProfileData scrape failed: {e}")
        return []


def store_scraped_prices(db: Session, prices: list):
    """
    Store scraped prices in the scraped_prices table.
    Does NOT wipe old data — upserts by instrument_code + source.
    """
    from models import ScrapedPrice

    stored = 0
    for p in prices:
        # Use fund_name as the code (cleaned)
        code = _clean_fund_name(p['fund_name'])

        existing = (
            db.query(ScrapedPrice)
            .filter(ScrapedPrice.instrument_code == code, ScrapedPrice.source == 'profiledata')
            .first()
        )

        if existing:
            existing.nav_price = p['nav']
            existing.nav_date = p['price_date']
            existing.instrument_name = p['fund_name']
            existing.scraped_at = datetime.now(timezone.utc)
        else:
            db.add(ScrapedPrice(
                instrument_code=code,
                instrument_name=p['fund_name'],
                nav_price=p['nav'],
                nav_date=p['price_date'],
                source='profiledata',
            ))
        stored += 1

    db.commit()
    logger.info(f"Stored {stored} scraped prices")
    return stored


def match_holding_to_scraped(db: Session, stock_name: str):
    """
    Match a holding's stock name to a scraped price.
    Priority: exact code → cleaned name match → conservative fuzzy.
    Returns ScrapedPrice or None.

    NOTE: This matching is intentionally conservative.
    We'd rather return None than match the wrong fund class.
    """
    from models import ScrapedPrice

    clean_name = _clean_fund_name(stock_name)

    # 1. Exact code match
    exact = db.query(ScrapedPrice).filter(
        ScrapedPrice.instrument_code == clean_name,
        ScrapedPrice.source == 'profiledata',
    ).first()
    if exact:
        return exact

    # 2. Exact instrument_name match
    name_match = db.query(ScrapedPrice).filter(
        ScrapedPrice.instrument_name == stock_name,
        ScrapedPrice.source == 'profiledata',
    ).first()
    if name_match:
        return name_match

    # 3. Conservative contains match — stock_name must be fully contained
    #    in the scraped name (not the other way around, to avoid wrong class)
    all_scraped = db.query(ScrapedPrice).filter(
        ScrapedPrice.source == 'profiledata'
    ).all()

    for sp in all_scraped:
        if stock_name.lower().strip() in sp.instrument_name.lower():
            return sp

    # 4. No match — return None rather than risk a wrong match
    return None


def _clean_fund_name(name: str) -> str:
    """Normalize fund name for matching."""
    return re.sub(r'\s+', ' ', name.strip().lower())


def run_daily_scrape(db: Session):
    """
    Main entry point for the daily scrape job.
    Call after market close (~17:30 SAST).

    TEMPORARY: This will be replaced with a professional data feed.
    """
    logger.info("Starting ProfileData NAV scrape...")
    prices = scrape_latest_prices()

    if not prices:
        logger.warning("Scrape returned no prices — preserving existing data")
        return {"scraped": 0, "stored": 0}

    stored = store_scraped_prices(db, prices)

    return {
        "scraped": len(prices),
        "stored": stored,
        "source": SOURCE_URL,
    }
