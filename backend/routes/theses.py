from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Thesis, Tier
from schemas import ThesisCreate, ThesisUpdate, ThesisOut
from auth import get_current_user
from tier_access import get_access_tier, can_view

router = APIRouter(prefix="/api/theses", tags=["theses"])


@router.post("/", response_model=ThesisOut, status_code=201)
def create_thesis(
    data: ThesisCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    visibility = Tier(data.visibility)

    thesis = Thesis(
        user_id=user.id,
        contract_code=data.contract_code,
        stock_name=data.stock_name,
        body=data.body,
        visibility=visibility,
    )
    db.add(thesis)
    db.commit()
    db.refresh(thesis)

    try:
        from routes.auth import mark_step_complete
        mark_step_complete(db, user.id, "add_thesis")
    except Exception:
        pass

    result = ThesisOut.model_validate(thesis)
    result.display_name = user.display_name
    return result


@router.get("/stock/{contract_code}", response_model=list[ThesisOut])
def get_theses_for_stock(
    contract_code: str,
    sort: str = Query("recent"),
    people: str = Query("everyone"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models import Follow, FollowStatus

    query = db.query(Thesis).filter(Thesis.contract_code == contract_code)

    if people == "following":
        following_ids = [
            f[0] for f in
            db.query(Follow.following_id)
            .filter(Follow.follower_id == user.id, Follow.status == FollowStatus.active)
            .all()
        ]
        following_ids.append(user.id)
        query = query.filter(Thesis.user_id.in_(following_ids))

    if sort == "oldest":
        query = query.order_by(Thesis.created_at.asc())
    else:
        query = query.order_by(Thesis.created_at.desc())

    theses = query.all()

    result = []
    for t in theses:
        access = get_access_tier(db, user.id, t.user_id)
        if can_view(access, t.visibility):
            out = ThesisOut.model_validate(t)
            out.display_name = t.user.display_name
            result.append(out)

    return result


@router.get("/user/{user_id}", response_model=list[ThesisOut])
def get_user_theses(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    access = get_access_tier(db, user.id, user_id)

    theses = (
        db.query(Thesis)
        .filter(Thesis.user_id == user_id)
        .order_by(Thesis.created_at.desc())
        .all()
    )

    result = []
    for t in theses:
        if can_view(access, t.visibility):
            out = ThesisOut.model_validate(t)
            out.display_name = target.display_name
            result.append(out)

    return result


@router.put("/{thesis_id}", response_model=ThesisOut)
def update_thesis(
    thesis_id: int,
    data: ThesisUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")
    if thesis.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your thesis")

    if data.body is not None:
        thesis.body = data.body
    if data.visibility is not None:
        thesis.visibility = Tier(data.visibility)

    db.commit()
    db.refresh(thesis)

    result = ThesisOut.model_validate(thesis)
    result.display_name = user.display_name
    return result


@router.delete("/{thesis_id}")
def delete_thesis(
    thesis_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")
    if thesis.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your thesis")

    db.delete(thesis)
    db.commit()
    return {"message": "Thesis deleted"}
