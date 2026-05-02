"""
Pull EasyEquities trade-confirmation emails from a user's Gmail and turn
them into UserTransaction + Holding rows.

First sync: full back-fill from Gmail history.
Subsequent syncs: only emails received after the last sync timestamp.

Holding rebuild reuses the logic from ee_import._rebuild_holdings so the
P&L pipeline (instrument mapping, external prices, refresh) stays identical.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

import google_oauth
from email_parser import parse_ee_email, ParsedTrade
from models import User, UserTransaction

logger = logging.getLogger(__name__)


# Gmail search query: only EE trade confirmations.
EE_QUERY_BASE = (
    'from:info@easyequities.co.za '
    'subject:"Confirmation of your transaction"'
)


def _build_query(since: datetime | None) -> str:
    """Add an after:YYYY/MM/DD clause for incremental pulls."""
    if since is None:
        return EE_QUERY_BASE
    # Subtract 1 day so we don't miss anything around the timezone boundary;
    # message_id dedup will catch overlap.
    after = (since.astimezone(timezone.utc).date()).strftime("%Y/%m/%d")
    return f"{EE_QUERY_BASE} after:{after}"


def _contract_code_for(name: str) -> str:
    code = re.sub(r"[^A-Z0-9]", "", name.upper())[:10]
    return f"EE_{code}"


async def sync_user_trades(db: Session, user: User) -> dict:
    """
    Run a full sync for one user. Returns counts for the UI:
        {scanned, parsed, new_trades, skipped_duplicates, errors}
    """
    if not user.gmail_refresh_token_enc:
        raise RuntimeError("Gmail not connected for this user")

    access_token = await google_oauth.get_access_token_for_user(user)

    query = _build_query(user.gmail_last_synced_at)
    logger.info("Gmail sync for user %s with query: %s", user.id, query)

    message_ids = await google_oauth.list_message_ids(access_token, query=query)
    scanned = len(message_ids)
    parsed_count = 0
    new_trades = 0
    skipped_duplicates = 0
    errors = 0

    for mid in message_ids:
        try:
            msg = await google_oauth.get_message(access_token, mid)
        except Exception as e:
            logger.warning("Gmail get_message failed for %s: %s", mid, e)
            errors += 1
            continue

        parsed = _parse_message(msg, mid)
        if parsed is None:
            continue
        parsed_count += 1

        # Dedup: import_hash is derived from message_id + parsed fields; one
        # email = one transaction. If we've seen this message_id before, skip.
        existing = (
            db.query(UserTransaction)
            .filter(
                UserTransaction.user_id == user.id,
                UserTransaction.import_hash == parsed.import_hash(),
            )
            .first()
        )
        if existing:
            skipped_duplicates += 1
            continue

        # Position state: first trade ever for this user+stock = opening position.
        # Counted across both already-persisted rows and rows added earlier in this
        # same sync (which haven't been committed yet).
        contract_code = _contract_code_for(parsed.instrument_name)
        prior_count = (
            db.query(UserTransaction)
            .filter(
                UserTransaction.user_id == user.id,
                UserTransaction.contract_code == contract_code,
            )
            .count()
        )
        is_opening = prior_count == 0

        db.add(
            UserTransaction(
                user_id=user.id,
                action=parsed.action,
                stock_name=parsed.instrument_name,
                contract_code=contract_code,
                account_type=parsed.account_type,
                broker_name=parsed.broker_name,
                quantity=parsed.quantity,
                price=parsed.trade_price,
                # Prefer total_cost (incl. fees / net of fees on sells) for P&L accuracy;
                # fall back to trade_value (gross), then quantity * price as last resort.
                amount=(
                    parsed.total_cost
                    if parsed.total_cost is not None
                    else parsed.trade_value
                    if parsed.trade_value is not None
                    else (parsed.quantity * parsed.trade_price)
                    if parsed.trade_price is not None
                    else None
                ),
                transaction_date=parsed.submission_date or parsed.received_at,
                is_opening_position=is_opening,
                import_hash=parsed.import_hash(),
            )
        )
        # Flush so the next iteration's count() sees this row.
        db.flush()
        new_trades += 1

    db.flush()

    # Rebuild holdings from the full transaction set per account type.
    if new_trades > 0:
        try:
            from ee_import import _rebuild_holdings  # reuse the existing pipeline
            account_types = {
                t.account_type
                for t in db.query(UserTransaction.account_type)
                .filter(UserTransaction.user_id == user.id)
                .distinct()
            }
            for at in account_types:
                _rebuild_holdings(db, user, at)
        except Exception as e:
            logger.exception("Holding rebuild failed: %s", e)

    google_oauth.mark_synced(db, user)
    db.commit()

    return {
        "scanned": scanned,
        "parsed": parsed_count,
        "new_trades": new_trades,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
    }


def _parse_message(msg: dict, message_id: str) -> ParsedTrade | None:
    headers = google_oauth.message_headers(msg)
    sender = headers.get("from", "")
    subject = headers.get("subject", "")

    # Use the Gmail-provided receive timestamp (epoch ms).
    internal_ms = int(msg.get("internalDate", "0") or 0)
    received_at = (
        datetime.fromtimestamp(internal_ms / 1000, tz=timezone.utc)
        if internal_ms
        else datetime.now(timezone.utc)
    )

    text_plain, text_html = google_oauth.extract_message_body(msg)

    return parse_ee_email(
        message_id=message_id,
        sender=sender,
        subject=subject,
        received_at=received_at,
        text_plain=text_plain,
        text_html=text_html,
    )
