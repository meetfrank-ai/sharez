import os
import logging

from fastapi import APIRouter, Depends, Query
from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/search")
def search_stocks(
    q: str = Query("", min_length=2),
    user: User = Depends(get_current_user),
):
    """Search for stocks across JSE (cached list) and global (EODHD search API)."""
    if len(q) < 2:
        return []

    results = []
    seen = set()
    query = q.lower()

    # Source 1: JSE symbol list (fast, cached)
    from ticker_resolver import get_jse_symbols
    jse_symbols = get_jse_symbols()
    for s in jse_symbols:
        name = s.get("Name", "")
        code = s.get("Code", "")
        if query in name.lower() or query in code.lower():
            key = f"{code}.JSE"
            if key not in seen:
                seen.add(key)
                results.append({
                    "name": name,
                    "code": code,
                    "exchange": "JSE",
                    "ticker": f"{code}.JSE",
                    "type": s.get("Type", ""),
                    "currency": s.get("Currency", "ZAC"),
                })

    # Source 2: EODHD global search (for US and other exchanges)
    eodhd_key = os.getenv("EODHD_API_KEY")
    if eodhd_key and len(results) < 10:
        try:
            import httpx
            resp = httpx.get(
                f"https://eodhd.com/api/search/{q}",
                params={"api_token": eodhd_key, "fmt": "json", "limit": 10},
                timeout=5,
            )
            if resp.status_code == 200:
                for s in resp.json():
                    code = s.get("Code", "")
                    exchange = s.get("Exchange", "")
                    key = f"{code}.{exchange}"
                    if key not in seen:
                        seen.add(key)
                        results.append({
                            "name": s.get("Name", ""),
                            "code": code,
                            "exchange": exchange,
                            "ticker": key,
                            "type": s.get("Type", ""),
                            "currency": s.get("Currency", ""),
                        })
        except Exception as e:
            logger.warning(f"EODHD search failed: {e}")

    return results[:15]
