import os
import json
import base64
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models import User, Trade, Note, Tier
from schemas import TradeCreate, TradeOut, TradeExtraction
from auth import get_current_user
from tier_access import get_access_tier, can_view

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.post("/extract", response_model=TradeExtraction)
async def extract_trade_from_screenshot(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload a screenshot, Claude Vision extracts trade details."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI extraction not configured")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    mime = file.content_type or "image/jpeg"
    b64 = base64.b64encode(contents).decode()

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime,
                            "data": b64,
                        }
                    },
                    {
                        "type": "text",
                        "text": """This is a screenshot from the Easy Equities investment app. Extract the trade/order details.

Return ONLY a JSON object with these fields:
- "action": "buy" or "sell"
- "stock_name": the full stock or ETF name as shown
- "ticker": the ticker symbol if visible, otherwise null
- "date": the trade date in "YYYY-MM-DD" format if visible, otherwise null
- "account_type": the account name if visible (e.g. "EasyEquities ZAR", "TFSA", "EasyEquities USD"), otherwise null
- "amount_zar": the rand amount as a number if visible, otherwise null
- "share_price": the per-share price as a number if visible, otherwise null
- "shares": the number of shares as a number if visible, otherwise null
- "confidence": "high" if this clearly shows an EE trade confirmation, "medium" if it looks like EE but details are unclear, "low" if it doesn't look like an EE screenshot

If this does not appear to be an Easy Equities screenshot, return:
{"error": "This doesn't look like an Easy Equities trade confirmation.", "confidence": "low"}

Return ONLY valid JSON, no markdown."""
                    }
                ]
            }]
        )

        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]

        data = json.loads(text)
        return TradeExtraction(**data)

    except Exception as e:
        logger.error(f"Trade extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")


@router.post("/", response_model=TradeOut)
def create_trade(
    data: TradeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm and publish a trade."""
    visibility = Tier(data.visibility)

    # Create linked note if body provided
    note_id = None
    if data.note_body and data.note_body.strip():
        # Generate contract code for stock tag
        import re
        contract_code = f"EE_{re.sub(r'[^A-Z0-9]', '', data.stock_name.upper())[:10]}"

        note = Note(
            user_id=user.id,
            body=data.note_body[:500],
            visibility=visibility,
            stock_tag=contract_code,
            stock_name=data.stock_name,
        )
        db.add(note)
        db.flush()
        note_id = note.id

    # Parse trade date
    trade_date = None
    if data.trade_date:
        try:
            trade_date = datetime.strptime(data.trade_date[:10], "%Y-%m-%d")
        except ValueError:
            pass

    trade = Trade(
        user_id=user.id,
        action=data.action,
        stock_name=data.stock_name,
        ticker=data.ticker,
        market=data.market,
        account_type=data.account_type,
        trade_date=trade_date,
        amount_private=data.amount_private,
        share_price_private=data.share_price_private,
        shares_private=data.shares_private,
        screenshot_url=data.screenshot_url,
        ai_confidence=data.ai_confidence,
        visibility=visibility,
        note_id=note_id,
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)

    return _trade_to_out(trade, user, db)


@router.get("/user/{user_id}", response_model=list[TradeOut])
def get_user_trades(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a user's trades filtered by viewer's tier."""
    trades = (
        db.query(Trade)
        .filter(Trade.user_id == user_id)
        .order_by(Trade.created_at.desc())
        .limit(50)
        .all()
    )

    access = get_access_tier(db, current_user.id, user_id)

    result = []
    for t in trades:
        if can_view(access, t.visibility):
            trade_user = db.query(User).filter(User.id == t.user_id).first()
            result.append(_trade_to_out(t, trade_user, db))

    return result


@router.delete("/{trade_id}")
def delete_trade(
    trade_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()
    return {"message": "Trade deleted"}


def _trade_to_out(trade: Trade, trade_user: User, db: Session) -> TradeOut:
    """Convert trade to output schema — NEVER include private amounts."""
    note_body = None
    if trade.note_id:
        note = db.query(Note).filter(Note.id == trade.note_id).first()
        if note:
            note_body = note.body

    return TradeOut(
        id=trade.id,
        user_id=trade.user_id,
        display_name=trade_user.display_name if trade_user else None,
        handle=trade_user.handle if trade_user else None,
        action=trade.action,
        stock_name=trade.stock_name,
        ticker=trade.ticker,
        market=trade.market,
        account_type=trade.account_type,
        trade_date=trade.trade_date,
        is_verified=bool(trade.screenshot_url and trade.ai_confidence in ("high", "medium")),
        ai_confidence=trade.ai_confidence,
        visibility=trade.visibility.value,
        note_body=note_body,
        note_id=trade.note_id,
        created_at=trade.created_at,
    )


# ----- Bull/Bear reactions (Phase 2) -----

from pydantic import BaseModel as _BM
from models import TradeReaction


class ReactionRequest(_BM):
    sentiment: str  # "bull" or "bear"
    target_kind: str = "feed_event"  # "feed_event" | "trade"


@router.post("/{target_id}/react")
def react_to_trade(
    target_id: int,
    data: ReactionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Toggle/switch a Bull/Bear reaction on a trade-shaped feed item.
    POSTing the same sentiment again removes it; POSTing the opposite flips it.
    """
    sentiment = (data.sentiment or "").lower()
    if sentiment not in ("bull", "bear"):
        raise HTTPException(status_code=400, detail="sentiment must be 'bull' or 'bear'")
    target_kind = (data.target_kind or "feed_event").lower()
    if target_kind not in ("feed_event", "trade"):
        raise HTTPException(status_code=400, detail="target_kind must be 'feed_event' or 'trade'")

    existing = (
        db.query(TradeReaction)
        .filter(
            TradeReaction.user_id == user.id,
            TradeReaction.target_kind == target_kind,
            TradeReaction.target_id == target_id,
        )
        .first()
    )

    if existing and existing.sentiment == sentiment:
        # Same vote again = unvote
        db.delete(existing)
        db.commit()
        return _reaction_summary(db, target_kind, target_id, my_sentiment=None)

    if existing:
        existing.sentiment = sentiment
        db.commit()
    else:
        db.add(TradeReaction(
            user_id=user.id,
            target_kind=target_kind,
            target_id=target_id,
            sentiment=sentiment,
        ))
        db.commit()

    return _reaction_summary(db, target_kind, target_id, my_sentiment=sentiment)


@router.delete("/{target_id}/react")
def remove_reaction(
    target_id: int,
    target_kind: str = "feed_event",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(TradeReaction).filter(
        TradeReaction.user_id == user.id,
        TradeReaction.target_kind == target_kind,
        TradeReaction.target_id == target_id,
    ).delete()
    db.commit()
    return _reaction_summary(db, target_kind, target_id, my_sentiment=None)


def _reaction_summary(db: Session, target_kind: str, target_id: int, my_sentiment: str | None) -> dict:
    from sqlalchemy import func as _f
    rows = (
        db.query(TradeReaction.sentiment, _f.count())
        .filter(TradeReaction.target_kind == target_kind, TradeReaction.target_id == target_id)
        .group_by(TradeReaction.sentiment)
        .all()
    )
    counts = {s: c for s, c in rows}
    return {
        "target_kind": target_kind,
        "target_id": target_id,
        "bull_count": counts.get("bull", 0),
        "bear_count": counts.get("bear", 0),
        "my_sentiment": my_sentiment,
    }


@router.get("/reactions")
def get_reactions(
    target_ids: str = "",
    target_kind: str = "feed_event",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Batch fetch reaction summaries for a list of target IDs (used by feed)."""
    from sqlalchemy import func as _f
    if not target_ids:
        return {}
    try:
        ids = [int(x) for x in target_ids.split(",") if x.strip().isdigit()]
    except ValueError:
        return {}
    if not ids:
        return {}

    rows = (
        db.query(TradeReaction.target_id, TradeReaction.sentiment, _f.count())
        .filter(TradeReaction.target_kind == target_kind, TradeReaction.target_id.in_(ids))
        .group_by(TradeReaction.target_id, TradeReaction.sentiment)
        .all()
    )
    out: dict[int, dict] = {i: {"bull_count": 0, "bear_count": 0, "my_sentiment": None} for i in ids}
    for tid, sent, cnt in rows:
        out[tid][f"{sent}_count"] = cnt

    mine = (
        db.query(TradeReaction.target_id, TradeReaction.sentiment)
        .filter(
            TradeReaction.user_id == user.id,
            TradeReaction.target_kind == target_kind,
            TradeReaction.target_id.in_(ids),
        )
        .all()
    )
    for tid, sent in mine:
        out[tid]["my_sentiment"] = sent

    return out
