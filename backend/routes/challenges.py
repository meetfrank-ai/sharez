"""
Crystal Ball Challenge endpoints.

Mechanic recap (D-12): 500 invited participants pick 5 JSE stocks before
lockup, write a thesis per pick, locked for the challenge duration.
Anyone can view the challenge, leaderboard, and participant pages —
participation is gated by invite code.

Routes mounted under /api/challenges.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    Challenge,
    ChallengeInvite,
    ChallengeParticipant,
    Thesis,
    ThesisUpdate,
    Tier,
    User,
)

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


# ----- Helpers -----


def _challenge_out(c: Challenge, db: Session, viewer: User) -> dict:
    participant_count = (
        db.query(ChallengeParticipant)
        .filter(ChallengeParticipant.challenge_id == c.id)
        .count()
    )
    my = (
        db.query(ChallengeParticipant)
        .filter(
            ChallengeParticipant.challenge_id == c.id,
            ChallengeParticipant.user_id == viewer.id,
        )
        .first()
    )
    now = datetime.now(timezone.utc)
    is_locked_globally = c.lockup_at is not None and c.lockup_at.replace(tzinfo=timezone.utc) <= now
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "pick_count": c.pick_count,
        "max_participants": c.max_participants,
        "participant_count": participant_count,
        "market": c.market,
        "lockup_at": c.lockup_at.isoformat() if c.lockup_at else None,
        "end_at": c.end_at.isoformat() if c.end_at else None,
        "is_locked": is_locked_globally,
        "is_active": bool(c.is_active),
        "is_participant": my is not None,
        "my_picks_locked": bool(my and my.picks_locked),
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _thesis_out(t: Thesis, db: Session) -> dict:
    return {
        "id": t.id,
        "user_id": t.user_id,
        "user_display_name": t.user.display_name if t.user else None,
        "user_handle": t.user.handle if t.user else None,
        "contract_code": t.contract_code,
        "stock_name": t.stock_name,
        "title": t.title,
        "body": t.body,
        "is_locked": bool(t.is_locked),
        "locked_at": t.locked_at.isoformat() if t.locked_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updates": [
            {"id": u.id, "body": u.body, "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in (t.updates or [])
        ],
    }


# ----- Public read -----


@router.get("/")
def list_challenges(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenges = (
        db.query(Challenge)
        .filter(Challenge.is_active == True)  # noqa: E712
        .order_by(Challenge.created_at.desc())
        .all()
    )
    return [_challenge_out(c, db, user) for c in challenges]


@router.get("/{slug}")
def get_challenge(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return _challenge_out(c, db, user)


@router.get("/{slug}/leaderboard")
def get_leaderboard(
    slug: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Public — anyone with an account can see who's leading."""
    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")

    rows = (
        db.query(ChallengeParticipant, User)
        .join(User, User.id == ChallengeParticipant.user_id)
        .filter(ChallengeParticipant.challenge_id == c.id)
        .filter(ChallengeParticipant.picks_locked == True)  # noqa: E712
        .order_by(ChallengeParticipant.return_pct.desc().nullslast())
        .all()
    )

    return {
        "challenge": _challenge_out(c, db, user),
        "participants": [
            {
                "rank": i + 1,
                "user_id": u.id,
                "display_name": u.display_name,
                "handle": u.handle,
                "avatar_url": u.avatar_url,
                "return_pct": p.return_pct,
                "joined_at": p.joined_at.isoformat() if p.joined_at else None,
                "is_you": u.id == user.id,
            }
            for i, (p, u) in enumerate(rows)
        ],
    }


@router.get("/{slug}/participants/{user_id}")
def get_participant_picks(
    slug: str,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Public — anyone can view a participant's 5 picks + theses + updates."""
    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    p = (
        db.query(ChallengeParticipant)
        .filter(
            ChallengeParticipant.challenge_id == c.id,
            ChallengeParticipant.user_id == user_id,
        )
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Not a participant")

    theses = (
        db.query(Thesis)
        .filter(Thesis.challenge_id == c.id, Thesis.user_id == user_id)
        .order_by(Thesis.created_at.asc())
        .all()
    )

    return {
        "challenge": _challenge_out(c, db, user),
        "participant": {
            "user_id": target.id,
            "display_name": target.display_name,
            "handle": target.handle,
            "avatar_url": target.avatar_url,
            "return_pct": p.return_pct,
            "picks_locked": bool(p.picks_locked),
            "joined_at": p.joined_at.isoformat() if p.joined_at else None,
            "is_you": target.id == user.id,
        },
        "picks": [_thesis_out(t, db) for t in theses],
    }


@router.get("/{slug}/stock/{contract_code}/picks")
def get_stock_picks(
    slug: str,
    contract_code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """How many participants picked this stock + their theses. Used by
    StockDetail to surface 'X challenge participants picked this'."""
    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    theses = (
        db.query(Thesis)
        .filter(
            Thesis.challenge_id == c.id,
            Thesis.contract_code == contract_code,
            Thesis.is_locked == True,  # noqa: E712
        )
        .order_by(Thesis.created_at.asc())
        .all()
    )
    return {
        "challenge_slug": slug,
        "contract_code": contract_code,
        "pick_count": len(theses),
        "picks": [_thesis_out(t, db) for t in theses],
    }


# ----- Participation -----


class JoinRequest(BaseModel):
    invite_code: str


@router.post("/{slug}/join")
def join_challenge(
    slug: str,
    data: JoinRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")

    now = datetime.now(timezone.utc)
    if c.lockup_at and c.lockup_at.replace(tzinfo=timezone.utc) <= now:
        raise HTTPException(status_code=400, detail="Lockup has passed — joining closed")

    invite = (
        db.query(ChallengeInvite)
        .filter(
            ChallengeInvite.challenge_id == c.id,
            ChallengeInvite.code == data.invite_code,
        )
        .first()
    )
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid invite code")
    if invite.used_by_user_id is not None:
        raise HTTPException(status_code=400, detail="Invite code already used")

    existing = (
        db.query(ChallengeParticipant)
        .filter(
            ChallengeParticipant.challenge_id == c.id,
            ChallengeParticipant.user_id == user.id,
        )
        .first()
    )
    if existing:
        return _challenge_out(c, db, user)

    count = (
        db.query(ChallengeParticipant)
        .filter(ChallengeParticipant.challenge_id == c.id)
        .count()
    )
    if count >= c.max_participants:
        raise HTTPException(status_code=400, detail="Challenge is full")

    db.add(
        ChallengeParticipant(
            challenge_id=c.id,
            user_id=user.id,
            invited_by=invite.issued_to_user_id,
        )
    )
    invite.used_by_user_id = user.id
    invite.used_at = now
    db.commit()
    return _challenge_out(c, db, user)


class PickInput(BaseModel):
    contract_code: str
    stock_name: str
    title: str | None = None
    body: str  # the thesis


class PicksRequest(BaseModel):
    picks: list[PickInput]


@router.post("/{slug}/picks")
def submit_picks(
    slug: str,
    data: PicksRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit/replace picks before lockup. Once lockup_at passes the
    picks_locked flag flips and edits are no longer accepted."""
    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    p = (
        db.query(ChallengeParticipant)
        .filter(
            ChallengeParticipant.challenge_id == c.id,
            ChallengeParticipant.user_id == user.id,
        )
        .first()
    )
    if not p:
        raise HTTPException(status_code=403, detail="Not a participant")

    now = datetime.now(timezone.utc)
    if c.lockup_at and c.lockup_at.replace(tzinfo=timezone.utc) <= now:
        raise HTTPException(status_code=400, detail="Lockup has passed — picks are locked")
    if p.picks_locked:
        raise HTTPException(status_code=400, detail="Picks already locked")

    if len(data.picks) != c.pick_count:
        raise HTTPException(
            status_code=400,
            detail=f"This challenge requires exactly {c.pick_count} picks (got {len(data.picks)})",
        )
    seen = set()
    for pk in data.picks:
        if not pk.contract_code or not pk.body.strip():
            raise HTTPException(status_code=400, detail="Each pick needs a stock and a thesis body")
        if pk.contract_code in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate pick: {pk.contract_code}")
        seen.add(pk.contract_code)

    # Wipe existing draft picks for this challenge + user, then write fresh.
    db.query(Thesis).filter(
        Thesis.challenge_id == c.id, Thesis.user_id == user.id
    ).delete()
    for pk in data.picks:
        db.add(
            Thesis(
                user_id=user.id,
                contract_code=pk.contract_code,
                stock_name=pk.stock_name,
                title=pk.title,
                body=pk.body.strip(),
                visibility=Tier.public,
                challenge_id=c.id,
                is_locked=False,  # locks at lockup_at via cron
            )
        )
    db.commit()

    return {"saved": True, "pick_count": len(data.picks)}


@router.post("/{slug}/theses/{thesis_id}/update")
def add_thesis_update(
    slug: str,
    thesis_id: int,
    body: dict,  # {"body": "..."}
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Append-only update to a locked thesis (quarterly mechanic)."""
    text = (body.get("body") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Update body cannot be empty")

    t = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not t or t.user_id != user.id:
        raise HTTPException(status_code=404, detail="Thesis not found")
    if not t.challenge_id:
        raise HTTPException(status_code=400, detail="Updates only allowed on challenge picks")

    db.add(ThesisUpdate(thesis_id=t.id, body=text))
    db.commit()
    return {"ok": True}


# ----- Admin / seed (no UI) -----


class CreateChallengeRequest(BaseModel):
    name: str
    slug: str
    description: str | None = None
    pick_count: int = 5
    max_participants: int = 500
    market: str = "JSE"
    lockup_at: datetime
    end_at: datetime


@router.post("/admin/create")
def admin_create_challenge(
    data: CreateChallengeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin-only stub. For v1 the Crystal Ball Challenge is hard-coded;
    this endpoint exists so we can seed it from a script. Locks down to
    a small allowlist (only the founder accounts can call it)."""
    import os
    admin_emails = {e.strip() for e in os.getenv("SHAREZ_ADMIN_EMAILS", "").split(",") if e.strip()}
    if not admin_emails or user.email not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin only")

    if db.query(Challenge).filter(Challenge.slug == data.slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")

    c = Challenge(
        name=data.name,
        slug=data.slug,
        description=data.description,
        pick_count=data.pick_count,
        max_participants=data.max_participants,
        market=data.market,
        lockup_at=data.lockup_at,
        end_at=data.end_at,
        is_public_view=True,
        is_active=True,
        created_by=user.id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _challenge_out(c, db, user)


@router.post("/admin/{slug}/invites")
def admin_mint_invites(
    slug: str,
    count: int = 4,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin-only: mint N invite codes for a challenge. issued_to_user_id
    is left null; we attribute on use. Returns the codes for distribution."""
    import os
    admin_emails = {e.strip() for e in os.getenv("SHAREZ_ADMIN_EMAILS", "").split(",") if e.strip()}
    if not admin_emails or user.email not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin only")

    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")

    codes = []
    for _ in range(max(1, min(count, 100))):
        code = secrets.token_urlsafe(8)
        db.add(ChallengeInvite(challenge_id=c.id, code=code))
        codes.append(code)
    db.commit()
    return {"challenge_slug": slug, "codes": codes}
