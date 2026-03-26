"""
FundsData API integration — STUB

Will provide historical + current NAV prices for SA unit trusts.
Replacing the temporary ProfileData scraper once API access is obtained.

Expected endpoints (to be confirmed with FundsData):
  GET /v1/funds/{code}/nav?date=YYYY-MM-DD → historical NAV
  GET /v1/funds/{code}/nav/latest → current NAV
"""

import os
import logging

logger = logging.getLogger(__name__)


def fetch_fundsdata_historical(fundsdata_code: str, date: str):
    """Fetch historical NAV for a unit trust on a specific date."""
    key = os.getenv("FUNDSDATA_API_KEY")
    if not key:
        logger.debug(f"FundsData: no API key — skipping historical for {fundsdata_code}")
        return None

    # TODO: Implement when FundsData API access is obtained
    logger.info(f"FundsData historical: not yet implemented for {fundsdata_code} on {date}")
    return None


def fetch_fundsdata_current(fundsdata_code: str):
    """Fetch current NAV for a unit trust."""
    key = os.getenv("FUNDSDATA_API_KEY")
    if not key:
        logger.debug(f"FundsData: no API key — skipping current for {fundsdata_code}")
        return None

    # TODO: Implement when FundsData API access is obtained
    logger.info(f"FundsData current: not yet implemented for {fundsdata_code}")
    return None
