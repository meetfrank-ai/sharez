from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Follow, FollowStatus
from schemas import UserProfile
from auth import get_current_user
from tier_access import get_access_tier

router = APIRouter(prefix="/api/discover", tags=["discover"])


@router.get("/", response_model=list[UserProfile])
def discover_users(
    q: str = Query("", description="Search by name"),
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Browse/search users on the platform."""
    query = db.query(User).filter(User.id != current_user.id)

    if q:
        query = query.filter(
            (User.display_name.ilike(f"%{q}%")) | (User.handle.ilike(f"%{q}%"))
        )

    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for u in users:
        follower_count = db.query(Follow).filter(
            Follow.following_id == u.id, Follow.status == FollowStatus.active
        ).count()
        following_count = db.query(Follow).filter(
            Follow.follower_id == u.id, Follow.status == FollowStatus.active
        ).count()

        access = get_access_tier(db, current_user.id, u.id)
        config = u.tier_config
        vault_price = config.vault_price_cents if config else 0

        follow = db.query(Follow).filter(
            Follow.follower_id == current_user.id, Follow.following_id == u.id
        ).first()
        follow_status = follow.status.value if follow else "none"

        result.append(UserProfile(
            id=u.id,
            display_name=u.display_name,
            handle=u.handle,
            avatar_url=u.avatar_url,
            bio=u.bio,
            follower_count=follower_count,
            following_count=following_count,
            your_tier=access.value,
            follow_status=follow_status,
            vault_price_cents=vault_price,
            auto_accept_followers=config.auto_accept_followers if config else True,
            vault_shows=config.vault_shows if config else [],
            created_at=u.created_at,
        ))

    return result
