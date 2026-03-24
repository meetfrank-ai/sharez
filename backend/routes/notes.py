from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Note, NoteLike, SavedNote, NoteReshare, Follow, Tier, FollowStatus
from schemas import NoteCreate, NoteOut
from auth import get_current_user
from tier_access import get_access_tier, can_view

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _note_to_out(note: Note, current_user_id: int, db: Session) -> NoteOut:
    liked = db.query(NoteLike).filter(
        NoteLike.note_id == note.id, NoteLike.user_id == current_user_id
    ).first() is not None
    saved = db.query(SavedNote).filter(
        SavedNote.note_id == note.id, SavedNote.user_id == current_user_id
    ).first() is not None
    reshared = db.query(NoteReshare).filter(
        NoteReshare.note_id == note.id, NoteReshare.user_id == current_user_id
    ).first() is not None

    return NoteOut(
        id=note.id,
        user_id=note.user_id,
        display_name=note.user.display_name,
        handle=note.user.handle,
        avatar_url=note.user.avatar_url,
        body=note.body,
        visibility=note.visibility.value,
        stock_tag=note.stock_tag,
        stock_name=note.stock_name,
        parent_note_id=note.parent_note_id,
        like_count=note.like_count,
        reply_count=note.reply_count,
        transaction_ids=note.transaction_ids,
        image_url=note.image_url,
        reshare_count=note.reshare_count or 0,
        liked_by_me=liked,
        saved_by_me=saved,
        reshared_by_me=reshared,
        created_at=note.created_at,
    )


@router.post("/", response_model=NoteOut, status_code=201)
def create_note(
    data: NoteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    visibility = Tier(data.visibility)

    # Replies inherit parent visibility (cannot be more public)
    if data.parent_note_id:
        parent = db.query(Note).filter(Note.id == data.parent_note_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent note not found")

        # Check viewer has access to parent
        access = get_access_tier(db, user.id, parent.user_id)
        if not can_view(access, parent.visibility):
            raise HTTPException(status_code=403, detail="No access to parent note")

        from tier_access import TIER_RANK
        if TIER_RANK[visibility] < TIER_RANK[parent.visibility]:
            visibility = parent.visibility

    note = Note(
        user_id=user.id,
        body=data.body,
        visibility=visibility,
        stock_tag=data.stock_tag,
        stock_name=data.stock_name,
        parent_note_id=data.parent_note_id,
    )
    db.add(note)
    db.flush()

    # Update parent reply count
    if data.parent_note_id:
        parent.reply_count = (parent.reply_count or 0) + 1

    db.commit()
    db.refresh(note)
    return _note_to_out(note, user.id, db)


@router.get("/", response_model=list[NoteOut])
def get_feed_notes(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notes from people you follow, filtered by tier access."""
    # Get user IDs you follow
    following_ids = (
        db.query(Follow.following_id)
        .filter(Follow.follower_id == user.id, Follow.status == FollowStatus.active)
        .all()
    )
    following_ids = [f[0] for f in following_ids]
    following_ids.append(user.id)  # Include own notes

    notes = (
        db.query(Note)
        .filter(
            Note.user_id.in_(following_ids),
            Note.parent_note_id.is_(None),  # Top-level only
        )
        .order_by(Note.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Filter by tier access
    result = []
    for note in notes:
        access = get_access_tier(db, user.id, note.user_id)
        if can_view(access, note.visibility):
            result.append(_note_to_out(note, user.id, db))

    return result


@router.get("/user/{user_id}", response_model=list[NoteOut])
def get_user_notes(
    user_id: int,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    access = get_access_tier(db, current_user.id, user_id)

    notes = (
        db.query(Note)
        .filter(Note.user_id == user_id, Note.parent_note_id.is_(None))
        .order_by(Note.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for n in notes:
        out = _note_to_out(n, current_user.id, db)
        if not can_view(access, n.visibility):
            # Return a locked teaser instead of hiding the note
            out.body = (n.body[:100] + "...") if len(n.body) > 100 else n.body
            out.locked = True
            out.liked_by_me = False
        result.append(out)

    return result


@router.get("/{note_id}/thread", response_model=list[NoteOut])
def get_note_thread(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parent = db.query(Note).filter(Note.id == note_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Note not found")

    access = get_access_tier(db, current_user.id, parent.user_id)
    if not can_view(access, parent.visibility):
        raise HTTPException(status_code=403, detail="No access to this note")

    replies = (
        db.query(Note)
        .filter(Note.parent_note_id == note_id)
        .order_by(Note.created_at.asc())
        .all()
    )

    result = [_note_to_out(parent, current_user.id, db)]
    for r in replies:
        result.append(_note_to_out(r, current_user.id, db))

    return result


@router.post("/{note_id}/like")
def like_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    existing = db.query(NoteLike).filter(
        NoteLike.note_id == note_id, NoteLike.user_id == user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already liked")

    db.add(NoteLike(note_id=note_id, user_id=user.id))
    note.like_count = (note.like_count or 0) + 1
    db.commit()
    return {"message": "Liked", "like_count": note.like_count}


@router.delete("/{note_id}/like")
def unlike_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    like = db.query(NoteLike).filter(
        NoteLike.note_id == note_id, NoteLike.user_id == user.id
    ).first()
    if not like:
        raise HTTPException(status_code=404, detail="Not liked")

    db.delete(like)
    note = db.query(Note).filter(Note.id == note_id).first()
    note.like_count = max((note.like_count or 0) - 1, 0)
    db.commit()
    return {"message": "Unliked", "like_count": note.like_count}


@router.get("/stock/{contract_code}", response_model=list[NoteOut])
def get_stock_notes(
    contract_code: str,
    sort: str = Query("recent"),
    people: str = Query("everyone"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Note).filter(Note.stock_tag == contract_code, Note.parent_note_id.is_(None))

    if people == "following":
        following_ids = [
            f[0] for f in
            db.query(Follow.following_id)
            .filter(Follow.follower_id == current_user.id, Follow.status == FollowStatus.active)
            .all()
        ]
        following_ids.append(current_user.id)
        query = query.filter(Note.user_id.in_(following_ids))

    if sort == "oldest":
        query = query.order_by(Note.created_at.asc())
    else:
        query = query.order_by(Note.created_at.desc())

    notes = query.limit(50).all()

    result = []
    for note in notes:
        access = get_access_tier(db, current_user.id, note.user_id)
        if can_view(access, note.visibility):
            result.append(_note_to_out(note, current_user.id, db))

    return result


# --- Save ---

@router.post("/{note_id}/save")
def save_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    existing = db.query(SavedNote).filter(SavedNote.note_id == note_id, SavedNote.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already saved")
    db.add(SavedNote(note_id=note_id, user_id=user.id))
    db.commit()
    return {"message": "Saved"}


@router.delete("/{note_id}/save")
def unsave_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved = db.query(SavedNote).filter(SavedNote.note_id == note_id, SavedNote.user_id == user.id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Not saved")
    db.delete(saved)
    db.commit()
    return {"message": "Unsaved"}


@router.get("/saved", response_model=list[NoteOut])
def get_saved_notes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved = (
        db.query(SavedNote)
        .filter(SavedNote.user_id == user.id)
        .order_by(SavedNote.created_at.desc())
        .all()
    )
    result = []
    for s in saved:
        note = db.query(Note).filter(Note.id == s.note_id).first()
        if note:
            result.append(_note_to_out(note, user.id, db))
    return result


# --- Reshare ---

@router.post("/{note_id}/reshare")
def reshare_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    existing = db.query(NoteReshare).filter(NoteReshare.note_id == note_id, NoteReshare.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already reshared")
    db.add(NoteReshare(note_id=note_id, user_id=user.id))
    note.reshare_count = (note.reshare_count or 0) + 1
    db.commit()
    return {"message": "Reshared", "reshare_count": note.reshare_count}


@router.delete("/{note_id}/reshare")
def unreshare_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reshare = db.query(NoteReshare).filter(NoteReshare.note_id == note_id, NoteReshare.user_id == user.id).first()
    if not reshare:
        raise HTTPException(status_code=404, detail="Not reshared")
    db.delete(reshare)
    note = db.query(Note).filter(Note.id == note_id).first()
    note.reshare_count = max((note.reshare_count or 0) - 1, 0)
    db.commit()
    return {"message": "Unreshared", "reshare_count": note.reshare_count}


# --- Public note (no auth) ---

@router.get("/public/{note_id}")
def get_public_note(
    note_id: int,
    db: Session = Depends(get_db),
):
    """Public note for shared links — no auth required."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.visibility != Tier.public:
        raise HTTPException(status_code=403, detail="This note is not public")
    return {
        "id": note.id,
        "user_id": note.user_id,
        "display_name": note.user.display_name,
        "handle": note.user.handle,
        "body": note.body,
        "stock_tag": note.stock_tag,
        "stock_name": note.stock_name,
        "like_count": note.like_count,
        "reply_count": note.reply_count,
        "reshare_count": note.reshare_count or 0,
        "created_at": str(note.created_at),
    }

    return result
