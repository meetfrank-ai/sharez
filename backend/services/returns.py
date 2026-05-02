"""
Daily portfolio-returns snapshot service.

Computes a user's % return over 7d / 30d / all-time using the cached
HistoricalPrice table for past valuations vs current Holding values.
Stores into user_returns_snapshots for the Rank page.

Returns are always %; this module never stores or returns rand amounts
to keep D-7 enforced server-side.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import (
    HistoricalPrice,
    Holding,
    InstrumentMap,
    User,
    UserReturnsSnapshot,
    UserTransaction,
)

logger = logging.getLogger(__name__)


def compute_for_user(db: Session, user: User) -> dict | None:
    """Compute % returns for one user. Returns the snapshot dict or None
    if there's not enough data."""
    holdings = (
        db.query(Holding)
        .filter(Holding.user_id == user.id)
        .all()
    )
    if not holdings:
        return None

    total_cur = sum((h.current_value or 0) for h in holdings)
    total_cost = sum((h.purchase_value or 0) for h in holdings)
    if total_cost <= 0 or total_cur <= 0:
        return None

    return_all = round(((total_cur - total_cost) / total_cost) * 100, 2)

    # Past portfolio value approximation: sum(shares * historical_price) for
    # each holding's mapped EODHD symbol on the lookback date.
    past_total_for = {7: None, 30: None}
    for window in past_total_for.keys():
        target_date = (datetime.now(timezone.utc) - timedelta(days=window)).date()
        total = 0.0
        had_any = False
        for h in holdings:
            if not h.shares or h.shares <= 0:
                continue
            mapping = (
                db.query(InstrumentMap)
                .filter(InstrumentMap.ee_name == h.stock_name)
                .first()
            )
            if not mapping or not mapping.eodhd_symbol:
                continue
            row = (
                db.query(HistoricalPrice)
                .filter(
                    HistoricalPrice.symbol == mapping.eodhd_symbol,
                    HistoricalPrice.price_date <= datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc) + timedelta(days=1),
                )
                .order_by(HistoricalPrice.price_date.desc())
                .first()
            )
            if row and row.close_price:
                total += h.shares * row.close_price
                had_any = True
        past_total_for[window] = total if had_any else None

    def windowed(window):
        past = past_total_for[window]
        if past and past > 0:
            return round(((total_cur - past) / past) * 100, 2)
        return None

    top = max(holdings, key=lambda h: h.current_value or 0, default=None)

    return {
        "snapshot_date": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
        "return_7d_pct": windowed(7),
        "return_30d_pct": windowed(30),
        "return_all_pct": return_all,
        "holding_count": len(holdings),
        "top_contract_code": top.contract_code if top else None,
        "top_stock_name": top.stock_name if top else None,
    }


def refresh_all(db: Session) -> dict:
    """Daily snapshot pass over every user. Returns a small log dict."""
    users = db.query(User).all()
    written = 0
    skipped = 0
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    for u in users:
        try:
            data = compute_for_user(db, u)
            if not data:
                skipped += 1
                continue
            existing = (
                db.query(UserReturnsSnapshot)
                .filter(
                    UserReturnsSnapshot.user_id == u.id,
                    UserReturnsSnapshot.snapshot_date == today,
                )
                .first()
            )
            if existing:
                for k, v in data.items():
                    if k != "snapshot_date":
                        setattr(existing, k, v)
            else:
                db.add(UserReturnsSnapshot(user_id=u.id, **data))
            written += 1
        except Exception as e:
            logger.warning("Returns snapshot failed for user %s: %s", u.id, e)
            skipped += 1
            continue
    db.commit()
    return {"written": written, "skipped": skipped, "total": len(users)}
