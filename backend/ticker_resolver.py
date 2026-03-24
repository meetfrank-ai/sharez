"""
Dynamic ticker resolution — maps stock names to EODHD tickers.
Fetches JSE symbol list from EODHD and caches it.
Uses fuzzy matching to find the best ticker for a given stock name.
"""

import os
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# In-memory cache
_jse_symbols = []
_jse_cache_time = None
_JSE_CACHE_HOURS = 24


def _fetch_jse_symbols():
    """Fetch all JSE symbols from EODHD and cache."""
    global _jse_symbols, _jse_cache_time

    eodhd_key = os.getenv("EODHD_API_KEY")
    if not eodhd_key:
        return []

    try:
        import httpx
        resp = httpx.get(
            "https://eodhd.com/api/exchange-symbol-list/JSE",
            params={"api_token": eodhd_key, "fmt": "json"},
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                _jse_symbols = data
                _jse_cache_time = datetime.now(timezone.utc)
                logger.info(f"Cached {len(_jse_symbols)} JSE symbols")
                return _jse_symbols
    except Exception as e:
        logger.warning(f"Failed to fetch JSE symbols: {e}")

    return _jse_symbols


def get_jse_symbols():
    """Get cached JSE symbols, refreshing if stale."""
    global _jse_symbols, _jse_cache_time

    if _jse_cache_time:
        age = datetime.now(timezone.utc) - _jse_cache_time
        if age < timedelta(hours=_JSE_CACHE_HOURS) and _jse_symbols:
            return _jse_symbols

    return _fetch_jse_symbols()


def resolve_ticker(stock_name: str):
    """
    Resolve a stock name (from EE transaction) to an EODHD ticker.
    Returns 'CODE.JSE' or None if not found.
    """
    if not stock_name:
        return None

    symbols = get_jse_symbols()
    if not symbols:
        # Fallback to hardcoded map
        return _HARDCODED_MAP.get(stock_name)

    name_lower = stock_name.lower().strip()

    # 1. Exact name match
    for s in symbols:
        if s.get("Name", "").lower().strip() == name_lower:
            return f"{s['Code']}.JSE"

    # 2. Name contains match (stock_name is substring of EODHD name or vice versa)
    for s in symbols:
        eodhd_name = s.get("Name", "").lower()
        if name_lower in eodhd_name or eodhd_name in name_lower:
            return f"{s['Code']}.JSE"

    # 3. First word match (e.g. "Prosus N.V" matches "Prosus N.V.")
    first_word = name_lower.split()[0] if name_lower else ""
    if len(first_word) > 2:
        for s in symbols:
            if s.get("Name", "").lower().startswith(first_word):
                return f"{s['Code']}.JSE"

    # 4. Fallback to hardcoded
    return _HARDCODED_MAP.get(stock_name)


# Fallback for when EODHD is unavailable
_HARDCODED_MAP = {
    "Capitec Bank": "CPI.JSE",
    "Capitec Bank Holdings": "CPI.JSE",
    "Naspers": "NPN.JSE",
    "Standard Bank": "SBK.JSE",
    "Shoprite": "SHP.JSE",
    "MTN": "MTN.JSE",
    "Sasol": "SOL.JSE",
    "FirstRand": "FSR.JSE",
    "Discovery": "DSY.JSE",
    "Woolworths": "WHL.JSE",
    "Absa Group": "ABG.JSE",
    "Sanlam": "SLM.JSE",
    "Clicks Group": "CLS.JSE",
    "Redefine Properties": "RDF.JSE",
    "Prosus N.V": "PRX.JSE",
}
