from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserTierConfig
from schemas import UserCreate, UserLogin, Token, UserOut, UserProfileUpdate
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
    )
    db.add(user)
    db.flush()

    # Create default tier config
    tier_config = UserTierConfig(user_id=user.id)
    db.add(tier_config)

    db.commit()
    db.refresh(user)

    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/complete-onboarding")
def complete_onboarding(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.has_onboarded = True
    db.commit()
    return {"message": "Onboarding complete"}


@router.put("/profile", response_model=UserOut)
def update_profile(
    data: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.bio is not None:
        user.bio = data.bio
    if data.linkedin_url is not None:
        user.linkedin_url = data.linkedin_url
    if data.twitter_url is not None:
        user.twitter_url = data.twitter_url
    if data.website_url is not None:
        user.website_url = data.website_url
    db.commit()
    db.refresh(user)
    return user
