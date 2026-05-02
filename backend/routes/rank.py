"""
Public leaderboard. Always %, never rand (D-7). Users opt-out via
UserTierConfig.show_on_rank (D-6 default = opt-out with informed signup
toggle, but the toggle UI lives in tier-settings).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from auth import get_current_user
from database import get_db
from models import User, UserReturnsSnapshot, UserTierConfig

router = APIRouter(prefix="/api/rank", tags=["rank"])


VALID_WINDOWS = {"7d": "return_7d_pct", "30d": "return_30d_pct", "all": "return_all_pct"}


@router.get("/")
def get_rank(
    window: str = Query("30d"),
    limit: int = Query(50, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if window not in VALID_WINDOWS:
        window = "30d"
    col = VALID_WINDOWS[window]

    # Most recent snapshot per user.
    latest_date = (
        db.query(UserReturnsSnapshot.snapshot_date)
        .order_by(UserReturnsSnapshot.snapshot_date.desc())
        .first()
    )
    if not latest_date:
        return {"window": window, "as_of": None, "users": []}
    as_of = latest_date[0]

    # Join with UserTierConfig to filter out opted-out users.
    rows = (
        db.query(UserReturnsSnapshot, User, UserTierConfig)
        .join(User, User.id == UserReturnsSnapshot.user_id)
        .outerjoin(UserTierConfig, UserTierConfig.user_id == User.id)
        .filter(UserReturnsSnapshot.snapshot_date == as_of)
        .filter(getattr(UserReturnsSnapshot, col).isnot(None))
        .filter((UserTierConfig.show_on_rank == True) | (UserTierConfig.show_on_rank.is_(None)))  # noqa: E712
        .order_by(desc(getattr(UserReturnsSnapshot, col)))
        .limit(limit)
        .all()
    )

    return {
        "window": window,
        "as_of": as_of.isoformat(),
        "users": [
            {
                "rank": i + 1,
                "user_id": u.id,
                "display_name": u.display_name,
                "handle": u.handle,
                "avatar_url": u.avatar_url,
                "return_pct": getattr(snap, col),
                "holding_count": snap.holding_count,
                "top_stock_name": snap.top_stock_name,
                "top_contract_code": snap.top_contract_code,
                "is_you": u.id == user.id,
            }
            for i, (snap, u, _cfg) in enumerate(rows)
        ],
    }
