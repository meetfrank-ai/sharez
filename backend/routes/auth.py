import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserTierConfig, Follow, FollowStatus, Tier
from pydantic import BaseModel
from schemas import UserCreate, UserLogin, Token, UserOut, UserProfileUpdate
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

HANDLE_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,20}$')


def _validate_handle(handle: str, db: Session, exclude_user_id: int = None):
    if not HANDLE_PATTERN.match(handle):
        raise HTTPException(status_code=400, detail="Handle must be 3-20 characters (letters, numbers, underscores)")
    query = db.query(User).filter(User.handle == handle.lower())
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Handle already taken")


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    _validate_handle(data.handle, db)

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        handle=data.handle.lower(),
    )
    db.add(user)
    db.flush()

    tier_config = UserTierConfig(user_id=user.id)
    db.add(tier_config)

    # Auto-follow demo accounts so new users see content immediately
    demo_users = db.query(User).filter(
        User.email.in_(["thabo@sharez.co.za", "sarah@sharez.co.za", "lebo@sharez.co.za"])
    ).all()
    for demo in demo_users:
        if demo.id != user.id:
            db.add(Follow(
                follower_id=user.id,
                following_id=demo.id,
                tier=Tier.inner_circle,
                status=FollowStatus.active,
            ))

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


@router.get("/google/debug")
def google_debug():
    """Public diagnostic — lists which Google client IDs the backend will
    accept on the /auth/google ID-token check. Client IDs are public; this
    endpoint never returns the client secret. Useful for verifying that the
    Render dashboard env var matches what the frontend bundle is sending."""
    import os
    client_id_env = os.getenv("GOOGLE_CLIENT_ID", "")
    from_env = [c.strip() for c in client_id_env.split(",") if c.strip()]
    return {
        "accepted_from_env": from_env,
        "accepted_from_fallback": [
            "516297867321-uaqq3njka2p2is1ulrdg47m6g1lfbsg5.apps.googleusercontent.com",
        ],
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI"),
    }


@router.post("/complete-onboarding")
def complete_onboarding(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.has_onboarded = True
    db.commit()
    return {"message": "Onboarding complete"}


# ----- Onboarding checklist (Phase 3) -----

ONBOARDING_STEPS = [
    {
        "key": "link_account",
        "title": "Link your EasyEquities account",
        "blurb": "Connect Gmail so we can read your trade confirmations and build your portfolio.",
        "cta": "Link account",
        "href": "/link-account",
    },
    {
        "key": "set_visibility",
        "title": "Set what your followers see",
        "blurb": "Pick what's free and what's behind your Vault. You can change this any time.",
        "cta": "Set visibility",
        "href": "/tier-settings",
    },
    {
        "key": "follow_someone",
        "title": "Follow someone interesting",
        "blurb": "Your Friends feed comes alive once you follow a few investors.",
        "cta": "Find people",
        "href": "/discover",
    },
    {
        "key": "add_thesis",
        "title": "Post your first thesis",
        "blurb": "Share why you're holding one of your stocks — a single paragraph is enough.",
        "cta": "Write a thesis",
        "href": "/portfolio",
    },
    {
        "key": "complete_profile",
        "title": "Finish your profile",
        "blurb": "Add a bio so people you might follow can decide if your style fits them.",
        "cta": "Edit profile",
        "href": "/profile",
    },
]


def mark_step_complete(db: Session, user_id: int, step_key: str) -> None:
    """Idempotent helper called from elsewhere in the codebase when an action lands."""
    from models import OnboardingStep
    valid_keys = {s["key"] for s in ONBOARDING_STEPS}
    if step_key not in valid_keys:
        return
    existing = (
        db.query(OnboardingStep)
        .filter(OnboardingStep.user_id == user_id, OnboardingStep.step_key == step_key)
        .first()
    )
    if existing:
        return
    db.add(OnboardingStep(user_id=user_id, step_key=step_key))
    db.commit()


@router.get("/onboarding")
def get_onboarding_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the 5-step checklist with completed flags for the current user."""
    from models import OnboardingStep

    completed = {
        s.step_key: s.completed_at
        for s in db.query(OnboardingStep).filter(OnboardingStep.user_id == user.id).all()
    }

    # Self-heal: derive a few obvious completions from existing state so users
    # who finished steps before this feature shipped don't see a stale checklist.
    if user.gmail_refresh_token_enc and "link_account" not in completed:
        mark_step_complete(db, user.id, "link_account")
        completed["link_account"] = True
    if user.bio and "complete_profile" not in completed:
        mark_step_complete(db, user.id, "complete_profile")
        completed["complete_profile"] = True

    steps = [
        {**s, "completed": s["key"] in completed}
        for s in ONBOARDING_STEPS
    ]
    done = sum(1 for s in steps if s["completed"])
    return {
        "steps": steps,
        "completed_count": done,
        "total": len(steps),
        "all_done": done == len(steps),
    }


@router.post("/onboarding/{step_key}/complete")
def complete_onboarding_step(
    step_key: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_keys = {s["key"] for s in ONBOARDING_STEPS}
    if step_key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Unknown step '{step_key}'")
    mark_step_complete(db, user.id, step_key)
    return {"ok": True, "step_key": step_key}


@router.put("/profile", response_model=UserOut)
def update_profile(
    data: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.handle is not None:
        _validate_handle(data.handle, db, exclude_user_id=user.id)
        user.handle = data.handle.lower()
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

    # Profile is "complete enough" once both bio and handle are populated.
    if user.bio and user.handle:
        try:
            mark_step_complete(db, user.id, "complete_profile")
        except Exception:
            pass

    return user


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from frontend


@router.post("/google", response_model=Token)
def google_auth(
    data: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    """Authenticate with Google. Creates account if new user."""
    import os, logging
    import httpx

    log = logging.getLogger(__name__)

    # Accept multiple comma-separated client IDs so we can rotate without an
    # immediate dashboard env-var update locking users out. Plus a hardcoded
    # known-good fallback for the active client so a stale dashboard value
    # never blocks login. Client IDs are public (not secrets), so this is
    # safe — verifying secrets happens via the OAuth callback flow elsewhere.
    KNOWN_GOOD = {
        "516297867321-uaqq3njka2p2is1ulrdg47m6g1lfbsg5.apps.googleusercontent.com",
    }
    client_id_env = os.getenv("GOOGLE_CLIENT_ID", "")
    accepted_client_ids = {c.strip() for c in client_id_env.split(",") if c.strip()}
    accepted_client_ids.update(KNOWN_GOOD)

    # Verify the Google ID token
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": data.credential},
            )
        if resp.status_code != 200:
            log.warning("Google tokeninfo failed: %s %s", resp.status_code, resp.text[:200])
            raise HTTPException(status_code=401, detail="Invalid Google token")
        google_data = resp.json()

        token_aud = google_data.get("aud")
        if token_aud not in accepted_client_ids:
            log.warning(
                "Google audience mismatch: token aud=%s, accepted=%s",
                token_aud,
                ", ".join(sorted(accepted_client_ids)),
            )
            raise HTTPException(
                status_code=401,
                detail=(
                    "Token not for this app. Check GOOGLE_CLIENT_ID env var matches the "
                    f"client that issued the token (token aud={token_aud})."
                ),
            )

        email = google_data.get("email")
        name = google_data.get("name", "")
        if not email:
            raise HTTPException(status_code=401, detail="No email in Google token")

    except HTTPException:
        raise
    except Exception as e:
        log.exception("Google verify error: %s", e)
        raise HTTPException(status_code=401, detail="Failed to verify Google token")

    # Check if user exists
    user = db.query(User).filter(User.email == email).first()

    if user:
        # Existing user — just login
        return Token(access_token=create_access_token(user.id))

    # New user — create account
    # Generate handle from name
    handle_base = re.sub(r'[^a-z0-9_]', '', name.lower().replace(' ', '_'))[:15]
    handle = handle_base
    counter = 1
    while db.query(User).filter(User.handle == handle).first():
        handle = f"{handle_base}{counter}"
        counter += 1

    user = User(
        email=email,
        password_hash=hash_password(os.urandom(32).hex()),  # Random password (user uses Google)
        display_name=name,
        handle=handle,
        has_onboarded=False,
    )
    db.add(user)
    db.flush()

    # Default tier config
    tier_config = UserTierConfig(user_id=user.id)
    db.add(tier_config)

    # Auto-follow demo accounts
    demo_users = db.query(User).filter(
        User.email.in_(["thabo@sharez.co.za", "sarah@sharez.co.za", "lebo@sharez.co.za"])
    ).all()
    for demo in demo_users:
        if demo.id != user.id:
            db.add(Follow(follower_id=user.id, following_id=demo.id,
                          tier=Tier.inner_circle, status=FollowStatus.active))

    db.commit()
    db.refresh(user)

    return Token(access_token=create_access_token(user.id))


class ChangeEmailRequest(BaseModel):
    new_email: str
    password: str


@router.put("/email", response_model=UserOut)
def change_email(
    data: ChangeEmailRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change the account email — required when the user wants to connect a Gmail
    address that differs from the one they signed up with (since EE confirmations
    must arrive at the same address as their Sharez account).
    """
    new_email = (data.new_email or "").strip().lower()
    if not new_email or "@" not in new_email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Password is incorrect")

    if new_email == user.email.lower():
        return user  # no-op

    if db.query(User).filter(User.email == new_email, User.id != user.id).first():
        raise HTTPException(status_code=400, detail="That email is already in use")

    # Changing the account email invalidates any existing Gmail connection,
    # since the connected mailbox no longer matches.
    user.email = new_email
    user.gmail_refresh_token_enc = None
    user.google_email = None
    user.gmail_last_synced_at = None
    user.gmail_history_id = None

    db.commit()
    db.refresh(user)
    return user


class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Send password reset email."""
    import os, secrets
    from datetime import datetime, timedelta, timezone

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If that email is registered, a reset link has been sent."}

    # Generate token
    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    # Send email via Resend
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        try:
            import resend
            resend.api_key = resend_key

            frontend_url = os.getenv("FRONTEND_URL", "https://sharez.onrender.com")
            reset_url = f"{frontend_url}/reset-password?token={token}"

            resend.Emails.send({
                "from": "Sharez <onboarding@resend.dev>",
                "to": [user.email],
                "subject": "Reset your Sharez password",
                "html": f"""
                <div style="font-family: Inter, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
                    <h2 style="color: #1A1A2E; margin-bottom: 16px;">Reset your password</h2>
                    <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
                        Hi {user.display_name},<br><br>
                        Click the button below to reset your Sharez password. This link expires in 1 hour.
                    </p>
                    <a href="{reset_url}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin: 20px 0;">
                        Reset Password
                    </a>
                    <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
                        If you didn't request this, you can ignore this email.
                    </p>
                </div>
                """,
            })
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send reset email: {e}")

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password with token from email."""
    from datetime import datetime, timezone

    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if user.password_reset_expires:
        expires = user.password_reset_expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Reset link has expired. Request a new one.")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()

    return {"message": "Password has been reset. You can now log in."}
