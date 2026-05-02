"""
Cumulative portfolio % return over time — the "track record" surface (D-14).

Walks the user's UserTransaction history chronologically, builds a daily
state of (shares-per-stock + cumulative cost), prices each day's holdings
from HistoricalPrice, and stores per-day return_pct in
user_portfolio_snapshots.

Per D-7, the API never exposes ZAR; only return_pct surfaces publicly.
total_cost / total_value are stored for owner-only views.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import (
    HistoricalPrice,
    InstrumentMap,
    User,
    UserPortfolioSnapshot,
    UserTransaction,
)

logger = logging.getLogger(__name__)


def _date_range(start: date, end: date):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def _eodhd_for(db: Session, contract_code: str, stock_name: str | None) -> str | None:
    m = (
        db.query(InstrumentMap)
        .filter(
            (InstrumentMap.ticker == contract_code)
            | (InstrumentMap.ee_name == stock_name)
        )
        .first()
    )
    return m.eodhd_symbol if m else None


def compute_user_history(db: Session, user: User, days: int | None = None) -> list[dict]:
    """
    Recompute the user's daily snapshots from scratch by walking
    transactions. days=None → from earliest tx forward; otherwise
    constrained to the last N days.

    Returns a list of dicts: {date, return_pct, total_cost, total_value}.
    Caller decides what to expose externally.
    """
    txs = (
        db.query(UserTransaction)
        .filter(
            UserTransaction.user_id == user.id,
            UserTransaction.transaction_date.isnot(None),
        )
        .order_by(UserTransaction.transaction_date.asc())
        .all()
    )
    if not txs:
        return []

    earliest = txs[0].transaction_date.date()
    today = datetime.now(timezone.utc).date()
    start = earliest
    if days is not None:
        start = max(earliest, today - timedelta(days=days))

    # Resolve EODHD symbols for every unique contract/stock once.
    seen_pairs = {(t.contract_code, t.stock_name) for t in txs}
    code_to_eodhd: dict[str, str] = {}
    for code, name in seen_pairs:
        eodhd = _eodhd_for(db, code, name)
        if eodhd:
            code_to_eodhd[code] = eodhd

    # Pre-fetch all close prices in [start, today] for the relevant symbols.
    eodhd_symbols = list(set(code_to_eodhd.values()))
    prices_by_symbol: dict[str, list[tuple[date, float]]] = defaultdict(list)
    if eodhd_symbols:
        rows = (
            db.query(HistoricalPrice)
            .filter(HistoricalPrice.symbol.in_(eodhd_symbols))
            .filter(HistoricalPrice.price_date >= datetime(start.year, start.month, start.day, tzinfo=timezone.utc) - timedelta(days=7))
            .order_by(HistoricalPrice.price_date.asc())
            .all()
        )
        for r in rows:
            prices_by_symbol[r.symbol].append((r.price_date.date(), r.close_price))

    def latest_close_on_or_before(symbol: str, day: date) -> float | None:
        # Linear scan with a hint cache would be faster, but lists are small (≤365 entries) per symbol.
        prices = prices_by_symbol.get(symbol) or []
        last = None
        for d, p in prices:
            if d > day:
                break
            last = p
        return last

    # Walk day-by-day, applying transactions and pricing the held basket.
    shares_by_code: dict[str, float] = defaultdict(float)
    cumulative_cost = 0.0  # cost basis (buys minus sell-side proceeds, naive)
    tx_idx = 0
    points: list[dict] = []

    for day in _date_range(start, today):
        # Apply any txs whose date <= this day
        while tx_idx < len(txs) and txs[tx_idx].transaction_date.date() <= day:
            tx = txs[tx_idx]
            qty = tx.quantity or 0
            amt = tx.amount or 0
            if tx.action == "buy":
                shares_by_code[tx.contract_code] += qty
                cumulative_cost += amt
            elif tx.action == "sell":
                shares_by_code[tx.contract_code] -= qty
                # Naive: subtract proceeds from cost basis. Crude but
                # produces sensible directional movement on the chart.
                cumulative_cost -= amt
            tx_idx += 1

        # Price today's basket
        value = 0.0
        priced = 0
        for code, shares in shares_by_code.items():
            if shares <= 0:
                continue
            symbol = code_to_eodhd.get(code)
            if not symbol:
                continue
            close = latest_close_on_or_before(symbol, day)
            if close is None:
                continue
            value += shares * close
            priced += 1

        if cumulative_cost > 0 and value > 0:
            return_pct = round(((value - cumulative_cost) / cumulative_cost) * 100, 2)
        else:
            return_pct = None

        points.append({
            "date": day.isoformat(),
            "return_pct": return_pct,
            "total_cost": round(cumulative_cost, 2) if cumulative_cost else 0,
            "total_value": round(value, 2) if value else 0,
            "holdings_priced": priced,
        })

    return points


def refresh_snapshots_for_user(db: Session, user: User, days: int | None = None) -> dict:
    """Recompute and persist snapshots. Replaces existing rows for the
    covered range. Returns count info for the caller."""
    points = compute_user_history(db, user, days=days)
    if not points:
        return {"written": 0, "first_date": None, "last_date": None}

    first = points[0]["date"]
    last = points[-1]["date"]
    # Wipe in-range existing rows and rewrite (cheap; per-user index)
    db.query(UserPortfolioSnapshot).filter(
        UserPortfolioSnapshot.user_id == user.id,
        UserPortfolioSnapshot.snapshot_date >= datetime.fromisoformat(first).replace(tzinfo=timezone.utc),
    ).delete(synchronize_session=False)

    for p in points:
        snap = UserPortfolioSnapshot(
            user_id=user.id,
            snapshot_date=datetime.fromisoformat(p["date"]).replace(tzinfo=timezone.utc),
            total_cost=p["total_cost"],
            total_value=p["total_value"],
            return_pct=p["return_pct"],
            holding_count=p["holdings_priced"],
        )
        db.add(snap)
    db.commit()
    return {"written": len(points), "first_date": first, "last_date": last}


def refresh_all_users(db: Session) -> dict:
    """Daily cron entrypoint."""
    users = db.query(User).all()
    written = 0
    skipped = 0
    for u in users:
        try:
            r = refresh_snapshots_for_user(db, u, days=None)
            written += r["written"]
            if r["written"] == 0:
                skipped += 1
        except Exception as e:
            logger.warning("Portfolio history failed for user %s: %s", u.id, e)
            skipped += 1
    return {"written": written, "skipped": skipped, "users": len(users)}
