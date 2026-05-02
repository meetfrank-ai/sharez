"""
Crystal Ball challenge background jobs:
  1. Lock picks once lockup_at passes (sets is_locked + locked_at on theses
     and picks_locked on the participant row).
  2. Refresh participant return_pct daily, equal-weighted across the
     participant's locked picks, computed from HistoricalPrice (close at
     lockup_at) vs current resolved price.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import (
    Challenge,
    ChallengeParticipant,
    HistoricalPrice,
    InstrumentMap,
    Thesis,
)

logger = logging.getLogger(__name__)


def _resolve_eodhd(db: Session, contract_code: str, stock_name: str) -> str | None:
    m = (
        db.query(InstrumentMap)
        .filter(
            (InstrumentMap.ticker == contract_code)
            | (InstrumentMap.ee_name == stock_name)
        )
        .first()
    )
    return m.eodhd_symbol if m else None


def _close_at(db: Session, eodhd_symbol: str, when: datetime) -> float | None:
    """Return the close price closest to (but at-or-before) the given date."""
    row = (
        db.query(HistoricalPrice)
        .filter(HistoricalPrice.symbol == eodhd_symbol)
        .filter(HistoricalPrice.price_date <= when)
        .order_by(HistoricalPrice.price_date.desc())
        .first()
    )
    return row.close_price if row else None


def lock_picks_for_passed_lockups(db: Session) -> dict:
    """Idempotent: for any active challenge whose lockup_at is in the past,
    flip is_locked + locked_at on each pick thesis and picks_locked on the
    participant row (only if they have exactly pick_count picks)."""
    now = datetime.now(timezone.utc)
    challenges = (
        db.query(Challenge)
        .filter(Challenge.is_active == True)  # noqa: E712
        .all()
    )
    locked_count = 0
    skipped_underpicked = 0
    for c in challenges:
        if not c.lockup_at:
            continue
        cutoff = c.lockup_at if c.lockup_at.tzinfo else c.lockup_at.replace(tzinfo=timezone.utc)
        if cutoff > now:
            continue

        participants = (
            db.query(ChallengeParticipant)
            .filter(ChallengeParticipant.challenge_id == c.id)
            .all()
        )
        for p in participants:
            theses = (
                db.query(Thesis)
                .filter(Thesis.challenge_id == c.id, Thesis.user_id == p.user_id)
                .all()
            )
            if len(theses) != c.pick_count:
                if not p.picks_locked:
                    skipped_underpicked += 1
                continue
            for t in theses:
                if not t.is_locked:
                    t.is_locked = True
                    t.locked_at = cutoff
            p.picks_locked = True
            locked_count += 1
    db.commit()
    return {"participants_locked": locked_count, "skipped_underpicked": skipped_underpicked}


def refresh_participant_returns(db: Session) -> dict:
    """Equal-weighted % return from lockup price → most-recent close per stock."""
    from price_resolver import resolve_price

    challenges = (
        db.query(Challenge)
        .filter(Challenge.is_active == True)  # noqa: E712
        .all()
    )
    updated = 0
    skipped = 0
    for c in challenges:
        participants = (
            db.query(ChallengeParticipant)
            .filter(
                ChallengeParticipant.challenge_id == c.id,
                ChallengeParticipant.picks_locked == True,  # noqa: E712
            )
            .all()
        )
        for p in participants:
            theses = (
                db.query(Thesis)
                .filter(
                    Thesis.challenge_id == c.id,
                    Thesis.user_id == p.user_id,
                    Thesis.is_locked == True,  # noqa: E712
                )
                .all()
            )
            if not theses:
                skipped += 1
                continue

            total_pct = 0.0
            counted = 0
            for t in theses:
                eodhd = _resolve_eodhd(db, t.contract_code, t.stock_name)
                if not eodhd:
                    continue
                start = _close_at(db, eodhd, t.locked_at or c.lockup_at)
                latest = resolve_price(db, t.stock_name)
                latest_price = (latest or {}).get("price")
                if not start or not latest_price or start <= 0:
                    continue
                total_pct += ((latest_price - start) / start) * 100
                counted += 1
            if counted == 0:
                skipped += 1
                continue
            p.return_pct = round(total_pct / counted, 2)
            updated += 1
    db.commit()
    return {"updated": updated, "skipped": skipped}
