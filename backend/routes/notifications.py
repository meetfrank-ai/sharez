"""
Notification routes + helpers.

`emit()` is the single entrypoint other route handlers use to create a
notification — keeps the call sites short and lets us centralise dedup
(don't notify yourself, don't double-notify in tight windows).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Notification, User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ----- Public emit helper -----

def emit(
    db: Session,
    *,
    user_id: int,
    kind: str,
    actor_user_id: int | None = None,
    target_kind: str | None = None,
    target_id: int | None = None,
    metadata: dict | None = None,
    dedupe_within_minutes: int = 0,
) -> Notification | None:
    """
    Create a notification. Returns the row (or None if suppressed).
    Suppression rules:
      - never notify yourself
      - if dedupe_within_minutes > 0, suppress when an identical
        (user_id, kind, target) exists in that window
    """
    if actor_user_id is not None and actor_user_id == user_id:
        return None

    if dedupe_within_minutes > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=dedupe_within_minutes)
        existing = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.kind == kind,
                Notification.actor_user_id == actor_user_id,
                Notification.target_kind == target_kind,
                Notification.target_id == target_id,
                Notification.created_at >= cutoff,
            )
            .first()
        )
        if existing:
            return None

    n = Notification(
        user_id=user_id,
        actor_user_id=actor_user_id,
        kind=kind,
        target_kind=target_kind,
        target_id=target_id,
        metadata_=metadata or {},
    )
    db.add(n)
    db.flush()
    return n


# ----- API -----


@router.get("/")
def list_notifications(
    unread_only: bool = False,
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Latest notifications for the current user, newest first."""
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    q = q.order_by(Notification.created_at.desc()).limit(min(limit, 100))
    rows = q.all()

    actor_ids = list({r.actor_user_id for r in rows if r.actor_user_id})
    actors = (
        {a.id: a for a in db.query(User).filter(User.id.in_(actor_ids)).all()}
        if actor_ids
        else {}
    )

    return [
        {
            "id": r.id,
            "kind": r.kind,
            "actor": (
                {
                    "id": actors[r.actor_user_id].id,
                    "display_name": actors[r.actor_user_id].display_name,
                    "handle": actors[r.actor_user_id].handle,
                    "avatar_url": actors[r.actor_user_id].avatar_url,
                }
                if r.actor_user_id and r.actor_user_id in actors
                else None
            ),
            "target_kind": r.target_kind,
            "target_id": r.target_id,
            "metadata": r.metadata_ or {},
            "read": r.read_at is not None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/unread-count")
def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .count()
    )
    return {"unread": n}


@router.post("/mark-all-read")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.read_at.is_(None)
    ).update({"read_at": now}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.post("/{notif_id}/read")
def mark_read(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = (
        db.query(Notification)
        .filter(Notification.id == notif_id, Notification.user_id == user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Not found")
    if not n.read_at:
        n.read_at = datetime.now(timezone.utc)
        db.commit()
    return {"ok": True}
