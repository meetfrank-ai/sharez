from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Thesis, Comment
from schemas import CommentCreate, CommentOut
from auth import get_current_user

router = APIRouter(prefix="/api/comments", tags=["comments"])


@router.post("/{thesis_id}", response_model=CommentOut, status_code=201)
def add_comment(
    thesis_id: int,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    comment = Comment(
        thesis_id=thesis_id,
        user_id=user.id,
        body=data.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    result = CommentOut.model_validate(comment)
    result.display_name = user.display_name
    return result


@router.get("/{thesis_id}", response_model=list[CommentOut])
def get_comments(
    thesis_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comments = (
        db.query(Comment)
        .filter(Comment.thesis_id == thesis_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    result = []
    for c in comments:
        out = CommentOut.model_validate(c)
        out.display_name = c.user.display_name if c.user else None
        result.append(out)
    return result
