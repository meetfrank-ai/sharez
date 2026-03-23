from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Follow, Subscription, FeedEvent, EventType, Tier, FollowStatus, SubscriptionStatus
from schemas import FollowOut, SubscriptionOut, UserProfile
from auth import get_current_user
from tier_access import get_access_tier

router = APIRouter(prefix="/api", tags=["follow"])


@router.post("/follow/{user_id}", response_model=FollowOut)
def follow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already following or request pending")

    config = target.tier_config
    auto_accept = config.auto_accept_followers if config else True

    follow = Follow(
        follower_id=current_user.id,
        following_id=user_id,
        tier=Tier.inner_circle,
        status=FollowStatus.active if auto_accept else FollowStatus.pending,
    )
    db.add(follow)

    if auto_accept:
        db.add(FeedEvent(
            user_id=current_user.id,
            event_type=EventType.new_follow,
            visibility=Tier.public,
            metadata_={"following_name": target.display_name, "following_id": user_id},
        ))

    db.commit()
    db.refresh(follow)

    result = FollowOut.model_validate(follow)
    result.display_name = target.display_name
    result.avatar_url = target.avatar_url
    return result


@router.delete("/follow/{user_id}")
def unfollow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follow = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        .first()
    )
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")

    db.delete(follow)
    db.commit()
    return {"message": "Unfollowed"}


@router.put("/follow/{user_id}/approve")
def approve_follow(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follow = (
        db.query(Follow)
        .filter(Follow.follower_id == user_id, Follow.following_id == current_user.id)
        .first()
    )
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    follow.status = FollowStatus.active
    db.commit()
    return {"message": "Follow request approved"}


@router.put("/follow/{user_id}/reject")
def reject_follow(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follow = (
        db.query(Follow)
        .filter(Follow.follower_id == user_id, Follow.following_id == current_user.id)
        .first()
    )
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    follow.status = FollowStatus.rejected
    db.commit()
    return {"message": "Follow request rejected"}


@router.put("/follow/{user_id}/grant-vip")
def grant_vip(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follow = (
        db.query(Follow)
        .filter(Follow.follower_id == user_id, Follow.following_id == current_user.id)
        .first()
    )
    if not follow:
        raise HTTPException(status_code=404, detail="This user is not following you")

    follow.is_vip = True
    follow.status = FollowStatus.active
    db.commit()
    return {"message": "VIP vault access granted"}


@router.get("/followers", response_model=list[FollowOut])
def get_followers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follows = (
        db.query(Follow)
        .filter(Follow.following_id == current_user.id)
        .order_by(Follow.created_at.desc())
        .all()
    )
    result = []
    for f in follows:
        out = FollowOut.model_validate(f)
        out.display_name = f.follower.display_name
        out.avatar_url = f.follower.avatar_url
        result.append(out)
    return result


@router.get("/following", response_model=list[FollowOut])
def get_following(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follows = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.status == FollowStatus.active)
        .order_by(Follow.created_at.desc())
        .all()
    )
    result = []
    for f in follows:
        out = FollowOut.model_validate(f)
        out.display_name = f.following.display_name
        out.avatar_url = f.following.avatar_url
        result.append(out)
    return result


@router.get("/profile/{user_id}", response_model=UserProfile)
def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    follower_count = db.query(Follow).filter(
        Follow.following_id == user_id, Follow.status == FollowStatus.active
    ).count()
    following_count = db.query(Follow).filter(
        Follow.follower_id == user_id, Follow.status == FollowStatus.active
    ).count()

    access = get_access_tier(db, current_user.id, user_id)
    vault_price = target.tier_config.vault_price_cents if target.tier_config else 0

    return UserProfile(
        id=target.id,
        display_name=target.display_name,
        avatar_url=target.avatar_url,
        bio=target.bio,
        linkedin_url=target.linkedin_url,
        twitter_url=target.twitter_url,
        website_url=target.website_url,
        follower_count=follower_count,
        following_count=following_count,
        your_tier=access.value,
        vault_price_cents=vault_price,
        created_at=target.created_at,
    )


@router.post("/subscribe/{user_id}", response_model=SubscriptionOut)
def subscribe_to_vault(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manual vault subscription — creator confirms payment separately."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    config = target.tier_config
    if not config or config.vault_price_cents == 0:
        raise HTTPException(status_code=400, detail="This user doesn't have a paid vault")

    existing = (
        db.query(Subscription)
        .filter(
            Subscription.subscriber_id == current_user.id,
            Subscription.creator_id == user_id,
            Subscription.status == SubscriptionStatus.active,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed")

    sub = Subscription(
        subscriber_id=current_user.id,
        creator_id=user_id,
        amount_cents=config.vault_price_cents,
        status=SubscriptionStatus.active,
    )
    db.add(sub)

    # Ensure follow exists and is active
    follow = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        .first()
    )
    if not follow:
        follow = Follow(
            follower_id=current_user.id,
            following_id=user_id,
            tier=Tier.vault,
            status=FollowStatus.active,
        )
        db.add(follow)
    else:
        follow.tier = Tier.vault
        follow.status = FollowStatus.active

    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/subscribe/{user_id}")
def cancel_subscription(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.subscriber_id == current_user.id,
            Subscription.creator_id == user_id,
            Subscription.status == SubscriptionStatus.active,
        )
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")

    sub.status = SubscriptionStatus.cancelled
    db.commit()
    return {"message": "Subscription cancelled"}
