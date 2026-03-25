from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, FeedEvent, Follow, FollowStatus, Note, Thesis, NoteLike, NoteReshare, EventType, Trade
from schemas import UnifiedFeedItem
from auth import get_current_user
from tier_access import get_access_tier, can_view

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("/", response_model=list[UnifiedFeedItem])
def get_feed(
    filter: str = Query("all"),
    scope: str = Query("blend"),  # "community" = followed only, "discover" = everyone, "blend" = mix
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unified feed: notes + theses + transactions, merged chronologically."""
    # Get followed user IDs
    following_ids = [
        f[0] for f in
        db.query(Follow.following_id)
        .filter(Follow.follower_id == user.id, Follow.status == FollowStatus.active)
        .all()
    ]
    following_ids.append(user.id)

    # Determine which users to show content from
    community_only = scope == "community"

    items = []

    # Fetch notes (top-level only, exclude trade-linked notes that render inside TradeCards)
    if filter in ("all", "notes"):
        from sqlalchemy import or_
        note_query = db.query(Note).filter(
            Note.parent_note_id.is_(None),
            or_(Note.trade_linked.is_(None), Note.trade_linked == False),
        )
        if community_only:
            note_query = note_query.filter(Note.user_id.in_(following_ids))
        notes = note_query.order_by(Note.created_at.desc()).limit(limit * 2).all()
        for n in notes:
            access = get_access_tier(db, user.id, n.user_id)
            if not can_view(access, n.visibility):
                continue
            liked = db.query(NoteLike).filter(
                NoteLike.note_id == n.id, NoteLike.user_id == user.id
            ).first() is not None
            items.append(UnifiedFeedItem(
                item_type="note",
                id=n.id,
                user_id=n.user_id,
                display_name=n.user.display_name,
                handle=n.user.handle,
                avatar_url=n.user.avatar_url,
                created_at=n.created_at,
                visibility=n.visibility.value,
                body=n.body,
                stock_tag=n.stock_tag,
                stock_name=n.stock_name,
                like_count=n.like_count,
                reply_count=n.reply_count,
                liked_by_me=liked,
                parent_note_id=n.parent_note_id,
            ))

    # Fetch theses
    if filter in ("all", "theses"):
        thesis_query = db.query(Thesis)
        if community_only:
            thesis_query = thesis_query.filter(Thesis.user_id.in_(following_ids))
        theses = thesis_query.order_by(Thesis.created_at.desc()).limit(limit * 2).all()
        for t in theses:
            access = get_access_tier(db, user.id, t.user_id)
            if not can_view(access, t.visibility):
                continue
            items.append(UnifiedFeedItem(
                item_type="thesis",
                id=t.id,
                user_id=t.user_id,
                display_name=t.user.display_name,
                handle=t.user.handle,
                avatar_url=t.user.avatar_url,
                created_at=t.created_at,
                visibility=t.visibility.value,
                body=t.body,
                stock_tag=t.contract_code,
                stock_name=t.stock_name,
                contract_code=t.contract_code,
            ))

    # Fetch transactions (buy/sell only)
    if filter in ("all", "transactions"):
        tx_query = db.query(FeedEvent).filter(
                FeedEvent.event_type.in_([EventType.added_stock, EventType.removed_stock]),
            )
        if community_only:
            tx_query = tx_query.filter(FeedEvent.user_id.in_(following_ids))
        events = (
            tx_query
            .order_by(FeedEvent.created_at.desc())
            .limit(limit * 2)
            .all()
        )
        for e in events:
            access = get_access_tier(db, user.id, e.user_id)
            if not can_view(access, e.visibility):
                continue
            event_user = db.query(User).filter(User.id == e.user_id).first()
            items.append(UnifiedFeedItem(
                item_type="transaction",
                id=e.id,
                user_id=e.user_id,
                display_name=event_user.display_name if event_user else None,
                handle=event_user.handle if event_user else None,
                avatar_url=event_user.avatar_url if event_user else None,
                created_at=e.created_at,
                visibility=e.visibility.value,
                event_type=e.event_type.value,
                metadata=e.metadata_,
                stock_name=e.metadata_.get("stock_name") if e.metadata_ else None,
                stock_tag=e.metadata_.get("contract_code") if e.metadata_ else None,
            ))

    # Fetch verified trades
    if filter in ("all", "transactions"):
        trade_query = db.query(Trade)
        if community_only:
            trade_query = trade_query.filter(Trade.user_id.in_(following_ids))
        verified_trades = trade_query.order_by(Trade.created_at.desc()).limit(limit * 2).all()
        for t in verified_trades:
            access = get_access_tier(db, user.id, t.user_id)
            if not can_view(access, t.visibility):
                continue
            trade_user = db.query(User).filter(User.id == t.user_id).first()
            # Get linked note body
            note_body = None
            if t.note_id:
                linked_note = db.query(Note).filter(Note.id == t.note_id).first()
                if linked_note:
                    note_body = linked_note.body
            items.append(UnifiedFeedItem(
                item_type="trade",
                id=t.id,
                user_id=t.user_id,
                display_name=trade_user.display_name if trade_user else None,
                handle=trade_user.handle if trade_user else None,
                avatar_url=trade_user.avatar_url if trade_user else None,
                created_at=t.created_at,
                visibility=t.visibility.value,
                event_type=t.action,  # "buy" or "sell"
                stock_name=t.stock_name,
                stock_tag=t.ticker,
                body=note_body,
                metadata={
                    "ticker": t.ticker,
                    "market": t.market,
                    "trade_date": str(t.trade_date)[:10] if t.trade_date else None,
                    "is_verified": bool(t.screenshot_url and t.ai_confidence in ("high", "medium")),
                    "account_type": t.account_type,
                },
            ))

    # Fetch reshares (notes reshared by people you follow)
    if filter in ("all", "notes"):
        reshare_query = db.query(NoteReshare).join(Note, NoteReshare.note_id == Note.id)
        if community_only:
            reshare_query = reshare_query.filter(NoteReshare.user_id.in_(following_ids))
        reshares = reshare_query.order_by(NoteReshare.created_at.desc()).limit(limit).all()
        for r in reshares:
            note = db.query(Note).filter(Note.id == r.note_id).first()
            if not note:
                continue
            access = get_access_tier(db, user.id, note.user_id)
            if not can_view(access, note.visibility):
                continue
            resharer = db.query(User).filter(User.id == r.user_id).first()
            liked = db.query(NoteLike).filter(NoteLike.note_id == note.id, NoteLike.user_id == user.id).first() is not None
            items.append(UnifiedFeedItem(
                item_type="reshare",
                id=note.id,
                user_id=note.user_id,
                display_name=note.user.display_name,
                handle=note.user.handle,
                avatar_url=note.user.avatar_url,
                created_at=r.created_at,  # reshare time, not original note time
                visibility=note.visibility.value,
                body=note.body,
                stock_tag=note.stock_tag,
                stock_name=note.stock_name,
                like_count=note.like_count,
                reply_count=note.reply_count,
                liked_by_me=liked,
                reshared_by_name=resharer.display_name if resharer else None,
                reshared_by_handle=resharer.handle if resharer else None,
                reshared_by_id=r.user_id,
            ))

    # Sort all items chronologically and paginate
    items.sort(key=lambda x: x.created_at, reverse=True)
    return items[offset:offset + limit]


@router.get("/stock-summary")
async def get_stock_summary(
    contract_code: str,
    stock_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get rich AI-generated stock summary with community data."""
    from ai_summary import get_stock_summary as _get_summary
    from models import StockSummaryCache

    # Force refresh if requested
    refresh = contract_code  # Can add ?refresh=1 later
    # Clear stale cache entries that have no market data
    cached = db.query(StockSummaryCache).filter(StockSummaryCache.contract_code == contract_code).first()
    if cached:
        import json
        try:
            data = json.loads(cached.summary_text)
            if not data.get("market_data") or not data["market_data"].get("price"):
                db.delete(cached)
                db.commit()
        except Exception:
            db.delete(cached)
            db.commit()

    return await _get_summary(db, contract_code, stock_name, current_user_id=user.id)
