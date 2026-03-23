from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, FeedEvent, Follow, FollowStatus
from schemas import FeedEventOut
from auth import get_current_user
from tier_access import get_access_tier, can_view

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("/", response_model=list[FeedEventOut])
def get_feed(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregated feed from all users you follow, filtered by tier access."""
    following_ids = (
        db.query(Follow.following_id)
        .filter(Follow.follower_id == user.id, Follow.status == FollowStatus.active)
        .all()
    )
    following_ids = [f[0] for f in following_ids]
    following_ids.append(user.id)

    events = (
        db.query(FeedEvent)
        .filter(FeedEvent.user_id.in_(following_ids))
        .order_by(FeedEvent.created_at.desc())
        .offset(offset)
        .limit(limit * 2)  # Over-fetch to account for tier filtering
        .all()
    )

    result = []
    for event in events:
        if len(result) >= limit:
            break

        access = get_access_tier(db, user.id, event.user_id)
        if not can_view(access, event.visibility):
            continue

        event_user = db.query(User).filter(User.id == event.user_id).first()
        result.append(FeedEventOut(
            id=event.id,
            user_id=event.user_id,
            display_name=event_user.display_name if event_user else None,
            event_type=event.event_type.value,
            visibility=event.visibility.value,
            note_id=event.note_id,
            metadata=event.metadata_,
            created_at=event.created_at,
        ))

    return result


@router.get("/stock-summary")
async def get_stock_summary(
    contract_code: str,
    stock_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-generated stock summary."""
    from ai_summary import get_stock_summary as _get_summary
    summary = await _get_summary(db, contract_code, stock_name)
    return {"summary": summary}
