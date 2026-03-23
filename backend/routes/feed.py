from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, FeedEvent, Follow, FollowStatus, Note, Thesis, NoteLike, EventType
from schemas import UnifiedFeedItem
from auth import get_current_user
from tier_access import get_access_tier, can_view

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("/", response_model=list[UnifiedFeedItem])
def get_feed(
    filter: str = Query("all"),
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

    items = []

    # Fetch notes (top-level only)
    if filter in ("all", "notes"):
        notes = (
            db.query(Note)
            .filter(Note.user_id.in_(following_ids), Note.parent_note_id.is_(None))
            .order_by(Note.created_at.desc())
            .limit(limit * 2)
            .all()
        )
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
        theses = (
            db.query(Thesis)
            .filter(Thesis.user_id.in_(following_ids))
            .order_by(Thesis.created_at.desc())
            .limit(limit * 2)
            .all()
        )
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
        events = (
            db.query(FeedEvent)
            .filter(
                FeedEvent.user_id.in_(following_ids),
                FeedEvent.event_type.in_([EventType.added_stock, EventType.removed_stock]),
            )
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
    return await _get_summary(db, contract_code, stock_name, current_user_id=user.id)
