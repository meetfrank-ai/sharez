"""
Tier access utilities.

Determines what tier of access one user has to another user's content.
"""

from sqlalchemy.orm import Session

from models import Follow, Subscription, Tier, FollowStatus, SubscriptionStatus


# Tier hierarchy for comparison
TIER_RANK = {
    Tier.public: 0,
    Tier.inner_circle: 0,  # same as public — only two tiers now (free + vault)
    Tier.vault: 1,
}


def get_access_tier(db: Session, viewer_id: int, creator_id: int) -> Tier:
    """Determine what tier of access viewer has to creator's content."""
    if viewer_id == creator_id:
        return Tier.vault  # You always have full access to your own content

    # Check for active follow
    follow = (
        db.query(Follow)
        .filter(
            Follow.follower_id == viewer_id,
            Follow.following_id == creator_id,
            Follow.status == FollowStatus.active,
        )
        .first()
    )

    if not follow:
        return Tier.public

    # Check for VIP vault access
    if follow.is_vip:
        return Tier.vault

    # Check for paid vault subscription
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.subscriber_id == viewer_id,
            Subscription.creator_id == creator_id,
            Subscription.status == SubscriptionStatus.active,
        )
        .first()
    )

    if sub:
        return Tier.vault

    return Tier.public  # followers get free access, vault requires payment/VIP


def can_view(viewer_tier: Tier, content_tier: Tier) -> bool:
    """Check if a viewer's access tier allows viewing content at a given tier."""
    return TIER_RANK[viewer_tier] >= TIER_RANK[content_tier]
