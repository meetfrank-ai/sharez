"""
Gmail integration routes — connect, callback, sync, disconnect.

Trade confirmation emails come from info@easyequities.co.za. We enforce
that the connected Gmail address matches the Sharez account email so a
user can't accidentally connect someone else's mailbox.
"""

from __future__ import annotations

import logging
import os
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import google_oauth
from auth import get_current_user, create_access_token
from database import get_db
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gmail", tags=["gmail"])


# In-memory state store: state_token -> user_id. Survives one OAuth round-trip.
# We don't persist this — if the backend restarts mid-flow, the user just retries.
_OAUTH_STATE: dict[str, int] = {}


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "https://sharez.onrender.com")


@router.get("/connect")
def connect(user: User = Depends(get_current_user)):
    """
    Returns the Google consent URL the frontend should redirect the user to.
    The user authorizes gmail.readonly, Google redirects back to /api/gmail/callback.
    """
    state = secrets.token_urlsafe(24)
    _OAUTH_STATE[state] = user.id
    try:
        url = google_oauth.build_auth_url(state=state)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"auth_url": url}


@router.get("/callback")
async def callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    OAuth callback. Google redirects here with ?code=&state=.
    We exchange the code, verify the connected Gmail matches the user's
    account email, store the encrypted refresh token, and redirect the
    frontend to a success page.
    """
    user_id = _OAUTH_STATE.pop(state, None)
    if user_id is None:
        return _frontend_redirect_error("invalid_state")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return _frontend_redirect_error("user_not_found")

    try:
        token_data = await google_oauth.exchange_code(code)
    except Exception as e:
        logger.exception("Token exchange failed")
        return _frontend_redirect_error("token_exchange_failed", message=str(e))

    refresh_token = token_data.get("refresh_token")
    access_token = token_data.get("access_token")
    if not refresh_token:
        # Happens if the user previously granted offline access without prompt=consent.
        return _frontend_redirect_error(
            "no_refresh_token",
            message="Disconnect Sharez under your Google account permissions and try again.",
        )

    # Find out which Gmail address they connected.
    info = await google_oauth.fetch_userinfo(access_token) if access_token else {}
    google_email = (info.get("email") or "").lower()

    if not google_email:
        return _frontend_redirect_error("no_email_returned")

    # Enforce: connected Gmail must match Sharez account email.
    if google_email != user.email.lower():
        return _frontend_redirect_error(
            "email_mismatch",
            message=(
                f"You signed in with {google_email} but your Sharez account is {user.email}. "
                "Change your Sharez email in Settings to match, or sign up again with the "
                "address EasyEquities emails go to."
            ),
        )

    google_oauth.store_refresh_token(db, user, refresh_token, google_email)

    # Mark the onboarding "link_account" step complete.
    try:
        from routes.auth import mark_step_complete
        mark_step_complete(db, user.id, "link_account")
    except Exception:
        pass

    return RedirectResponse(url=f"{_frontend_url()}/settings?gmail=connected", status_code=302)


@router.post("/disconnect")
async def disconnect(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke the Google grant and wipe the refresh token from our DB.
    """
    if user.gmail_refresh_token_enc:
        try:
            refresh = google_oauth.decrypt_token(user.gmail_refresh_token_enc)
            # Best-effort revoke at Google's side — don't fail if it errors.
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    "https://oauth2.googleapis.com/revoke",
                    params={"token": refresh},
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except Exception as e:
            logger.warning("Google revoke failed (continuing): %s", e)

    google_oauth.disconnect_gmail(db, user)
    return {"ok": True}


@router.get("/status")
def status(user: User = Depends(get_current_user)):
    """Lightweight status check for the frontend."""
    return {
        "connected": bool(user.gmail_refresh_token_enc),
        "google_email": user.google_email,
        "last_synced_at": user.gmail_last_synced_at.isoformat() if user.gmail_last_synced_at else None,
    }


@router.post("/sync")
async def sync(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Pull EasyEquities trade-confirmation emails into UserTransaction rows.
    First call back-fills history; subsequent calls only fetch new mail.
    """
    if not user.gmail_refresh_token_enc:
        raise HTTPException(status_code=400, detail="Gmail not connected")

    # Lazy import — gmail_sync depends on email_parser which we'll add next.
    try:
        from gmail_sync import sync_user_trades
    except ImportError as e:
        raise HTTPException(status_code=501, detail=f"Sync not yet implemented: {e}")

    result = await sync_user_trades(db, user)
    return result


def _frontend_redirect_error(code: str, message: str | None = None) -> RedirectResponse:
    qs = {"gmail": "error", "code": code}
    if message:
        qs["message"] = message
    return RedirectResponse(url=f"{_frontend_url()}/settings?{urlencode(qs)}", status_code=302)
