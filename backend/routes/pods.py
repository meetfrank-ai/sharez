"""
Pods — small private groups with a shared feed.

Membership gate: only members see a pod's feed; non-members get 403.
Feed reuses the same shapes as the main /api/feed (notes / theses /
trade events) but scoped to member user_ids.
"""

from __future__ import annotations

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    EventType,
    FeedEvent,
    Note,
    Pod,
    PodMember,
    Thesis,
    User,
)

router = APIRouter(prefix="/api/pods", tags=["pods"])


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:40] or "pod"


def _serialize_pod(pod: Pod, db: Session, viewer_id: int) -> dict:
    member_count = db.query(PodMember).filter(PodMember.pod_id == pod.id).count()
    is_member = (
        db.query(PodMember)
        .filter(PodMember.pod_id == pod.id, PodMember.user_id == viewer_id)
        .first()
        is not None
    )
    return {
        "id": pod.id,
        "name": pod.name,
        "slug": pod.slug,
        "description": pod.description,
        "is_private": bool(pod.is_private),
        "member_count": member_count,
        "member_limit": pod.member_limit,
        "is_member": is_member,
        "created_at": pod.created_at.isoformat() if pod.created_at else None,
    }


class PodCreate(BaseModel):
    name: str
    description: str | None = None
    is_private: bool = False


@router.post("/")
def create_pod(
    data: PodCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = (data.name or "").strip()
    if len(name) < 3:
        raise HTTPException(status_code=400, detail="Pod name must be at least 3 characters")

    base_slug = _slugify(name)
    slug = base_slug
    n = 1
    while db.query(Pod).filter(Pod.slug == slug).first():
        n += 1
        slug = f"{base_slug}-{n}"

    pod = Pod(
        name=name,
        slug=slug,
        description=data.description or None,
        created_by=user.id,
        is_private=bool(data.is_private),
    )
    db.add(pod)
    db.flush()
    db.add(PodMember(pod_id=pod.id, user_id=user.id, role="admin"))
    db.commit()
    db.refresh(pod)
    return _serialize_pod(pod, db, user.id)


@router.get("/me")
def list_my_pods(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pods = (
        db.query(Pod)
        .join(PodMember, PodMember.pod_id == Pod.id)
        .filter(PodMember.user_id == user.id)
        .all()
    )
    return [_serialize_pod(p, db, user.id) for p in pods]


@router.get("/discover")
def discover_pods(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Public pods the user isn't already a member of."""
    member_pod_ids = [
        m.pod_id for m in db.query(PodMember).filter(PodMember.user_id == user.id).all()
    ]
    pods = (
        db.query(Pod)
        .filter(Pod.is_private == False)  # noqa: E712
        .filter(~Pod.id.in_(member_pod_ids) if member_pod_ids else True)
        .order_by(Pod.created_at.desc())
        .limit(50)
        .all()
    )
    return [_serialize_pod(p, db, user.id) for p in pods]


@router.get("/{slug}")
def get_pod(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pod = db.query(Pod).filter(Pod.slug == slug).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    return _serialize_pod(pod, db, user.id)


@router.post("/{slug}/join")
def join_pod(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pod = db.query(Pod).filter(Pod.slug == slug).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    existing = (
        db.query(PodMember)
        .filter(PodMember.pod_id == pod.id, PodMember.user_id == user.id)
        .first()
    )
    if existing:
        return _serialize_pod(pod, db, user.id)

    count = db.query(PodMember).filter(PodMember.pod_id == pod.id).count()
    if pod.member_limit and count >= pod.member_limit:
        raise HTTPException(status_code=400, detail="Pod is full")

    db.add(PodMember(pod_id=pod.id, user_id=user.id, role="member"))
    db.commit()
    return _serialize_pod(pod, db, user.id)


@router.post("/{slug}/leave")
def leave_pod(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pod = db.query(Pod).filter(Pod.slug == slug).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    db.query(PodMember).filter(
        PodMember.pod_id == pod.id, PodMember.user_id == user.id
    ).delete()
    db.commit()
    return {"ok": True}


@router.get("/{slug}/feed")
def pod_feed(
    slug: str,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pod = db.query(Pod).filter(Pod.slug == slug).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    if not (
        db.query(PodMember)
        .filter(PodMember.pod_id == pod.id, PodMember.user_id == user.id)
        .first()
    ):
        raise HTTPException(status_code=403, detail="Members only")

    member_ids = [
        m.user_id for m in db.query(PodMember).filter(PodMember.pod_id == pod.id).all()
    ]

    items: list[dict] = []

    notes = (
        db.query(Note)
        .filter(Note.user_id.in_(member_ids), Note.parent_note_id.is_(None))
        .order_by(Note.created_at.desc())
        .limit(limit)
        .all()
    )
    for n in notes:
        items.append({
            "item_type": "note",
            "id": n.id,
            "user_id": n.user_id,
            "display_name": n.user.display_name,
            "handle": n.user.handle,
            "body": n.body,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    theses = (
        db.query(Thesis)
        .filter(Thesis.user_id.in_(member_ids))
        .order_by(Thesis.created_at.desc())
        .limit(limit)
        .all()
    )
    for t in theses:
        items.append({
            "item_type": "thesis",
            "id": t.id,
            "user_id": t.user_id,
            "display_name": t.user.display_name,
            "handle": t.user.handle,
            "body": t.body,
            "stock_name": t.stock_name,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    txs = (
        db.query(FeedEvent)
        .filter(
            FeedEvent.user_id.in_(member_ids),
            FeedEvent.event_type.in_([EventType.added_stock, EventType.removed_stock]),
        )
        .order_by(FeedEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    user_lookup = {u.id: u for u in db.query(User).filter(User.id.in_(member_ids)).all()}
    for e in txs:
        u = user_lookup.get(e.user_id)
        items.append({
            "item_type": "transaction",
            "id": e.id,
            "user_id": e.user_id,
            "display_name": u.display_name if u else None,
            "handle": u.handle if u else None,
            "event_type": e.event_type.value,
            "metadata": e.metadata_,
            "stock_name": (e.metadata_ or {}).get("stock_name"),
            "stock_tag": (e.metadata_ or {}).get("contract_code"),
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })

    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return items[:limit]
