"""
Google OAuth + Gmail API client for Sharez.

Implements the server-side authorization-code flow with offline access
so we can refresh tokens and read Gmail on the user's behalf.

Scope: gmail.readonly — we only ever read trade-confirmation emails.
"""

from __future__ import annotations

import base64
import logging
import os
from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from models import User

logger = logging.getLogger(__name__)

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"


def _client_id() -> str:
    cid = os.getenv("GOOGLE_CLIENT_ID")
    if not cid:
        raise RuntimeError("GOOGLE_CLIENT_ID not set")
    return cid


def _client_secret() -> str:
    secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not secret:
        raise RuntimeError("GOOGLE_CLIENT_SECRET not set")
    return secret


def _redirect_uri() -> str:
    uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not uri:
        raise RuntimeError("GOOGLE_REDIRECT_URI not set (e.g. https://sharez.onrender.com/api/gmail/callback)")
    return uri


def _fernet() -> Fernet:
    key = os.getenv("SHAREZ_FERNET_KEY")
    if not key:
        raise RuntimeError("SHAREZ_FERNET_KEY not set")
    return Fernet(key.encode())


def encrypt_token(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _fernet().decrypt(encrypted.encode()).decode()


def build_auth_url(state: str) -> str:
    """URL the user is redirected to for Gmail consent."""
    params = {
        "client_id": _client_id(),
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",  # force refresh_token on every connect
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{AUTH_ENDPOINT}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Exchange an authorization code for access + refresh tokens."""
    data = {
        "code": code,
        "client_id": _client_id(),
        "client_secret": _client_secret(),
        "redirect_uri": _redirect_uri(),
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(TOKEN_ENDPOINT, data=data)
    if resp.status_code != 200:
        logger.error("Token exchange failed: %s %s", resp.status_code, resp.text)
        raise RuntimeError(f"Token exchange failed: {resp.text}")
    return resp.json()


async def refresh_access_token(refresh_token: str) -> str:
    """Use a stored refresh token to get a fresh access token."""
    data = {
        "client_id": _client_id(),
        "client_secret": _client_secret(),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(TOKEN_ENDPOINT, data=data)
    if resp.status_code != 200:
        logger.error("Refresh failed: %s %s", resp.status_code, resp.text)
        raise RuntimeError(f"Refresh failed: {resp.text}")
    return resp.json()["access_token"]


async def fetch_userinfo(access_token: str) -> dict:
    """Fetch the connected Google account's email + name."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code != 200:
        # Falls back to /tokeninfo which works with id_token; but for an access
        # token we just return an empty dict and let caller skip the email field.
        logger.warning("userinfo failed: %s %s", resp.status_code, resp.text)
        return {}
    return resp.json()


# ----- Gmail API -----


async def list_message_ids(
    access_token: str,
    query: str,
    page_size: int = 50,
    max_pages: int = 20,
) -> list[str]:
    """List Gmail message IDs matching a search query."""
    ids: list[str] = []
    page_token: str | None = None
    pages = 0
    async with httpx.AsyncClient(timeout=20) as client:
        while pages < max_pages:
            params = {"q": query, "maxResults": page_size}
            if page_token:
                params["pageToken"] = page_token
            resp = await client.get(
                f"{GMAIL_API_BASE}/users/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Gmail list failed: {resp.status_code} {resp.text}")
            data = resp.json()
            for m in data.get("messages", []):
                ids.append(m["id"])
            page_token = data.get("nextPageToken")
            pages += 1
            if not page_token:
                break
    return ids


async def get_message(access_token: str, message_id: str) -> dict:
    """Fetch a single full Gmail message."""
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{GMAIL_API_BASE}/users/me/messages/{message_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"format": "full"},
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Gmail get failed: {resp.status_code} {resp.text}")
    return resp.json()


def extract_message_body(message: dict) -> tuple[str, str]:
    """
    Walk a Gmail message payload and return (text_plain, text_html).
    Either may be empty.
    """
    text_plain = ""
    text_html = ""

    def walk(part: dict):
        nonlocal text_plain, text_html
        mime = part.get("mimeType", "")
        body = part.get("body", {})
        data = body.get("data")
        if data:
            decoded = base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode(
                "utf-8", errors="replace"
            )
            if mime == "text/plain" and not text_plain:
                text_plain = decoded
            elif mime == "text/html" and not text_html:
                text_html = decoded
        for sub in part.get("parts", []) or []:
            walk(sub)

    payload = message.get("payload", {})
    walk(payload)
    return text_plain, text_html


def message_headers(message: dict) -> dict[str, str]:
    """Flatten Gmail message headers into a name->value dict (lower-cased keys)."""
    headers: dict[str, str] = {}
    for h in message.get("payload", {}).get("headers", []) or []:
        name = h.get("name", "").lower()
        if name:
            headers[name] = h.get("value", "")
    return headers


# ----- User helpers -----


def store_refresh_token(db: Session, user: User, refresh_token: str, google_email: str | None):
    user.gmail_refresh_token_enc = encrypt_token(refresh_token)
    if google_email:
        user.google_email = google_email
    db.commit()


def disconnect_gmail(db: Session, user: User):
    user.gmail_refresh_token_enc = None
    user.google_email = None
    user.gmail_last_synced_at = None
    user.gmail_history_id = None
    db.commit()


async def get_access_token_for_user(user: User) -> str:
    if not user.gmail_refresh_token_enc:
        raise RuntimeError("Gmail not connected for this user")
    refresh = decrypt_token(user.gmail_refresh_token_enc)
    return await refresh_access_token(refresh)


def mark_synced(db: Session, user: User, history_id: str | None = None):
    user.gmail_last_synced_at = datetime.now(timezone.utc)
    if history_id:
        user.gmail_history_id = history_id
    db.commit()
