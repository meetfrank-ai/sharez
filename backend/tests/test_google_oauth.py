"""Google OAuth helper tests — token round-trip + auth URL composition."""

from urllib.parse import urlparse, parse_qs

import google_oauth


def test_fernet_round_trip():
    secret = "1//0a-test-refresh-token"
    enc = google_oauth.encrypt_token(secret)
    assert enc != secret
    assert google_oauth.decrypt_token(enc) == secret


def test_build_auth_url_includes_required_params():
    url = google_oauth.build_auth_url(state="state-abc")
    parsed = urlparse(url)
    assert parsed.netloc == "accounts.google.com"
    qs = parse_qs(parsed.query)
    assert qs.get("response_type") == ["code"]
    assert qs.get("access_type") == ["offline"]
    assert qs.get("prompt") == ["consent"]
    assert qs.get("state") == ["state-abc"]
    assert "https://www.googleapis.com/auth/gmail.readonly" in qs.get("scope", [""])[0]


def test_build_auth_url_uses_configured_client_id():
    url = google_oauth.build_auth_url(state="x")
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    assert qs.get("client_id") == ["test-client-id"]


def test_extract_message_body_handles_simple_payload():
    """extract_message_body must base64-url-decode body data correctly."""
    import base64

    payload = base64.urlsafe_b64encode(b"hello world").decode().rstrip("=")
    msg = {
        "payload": {
            "mimeType": "multipart/alternative",
            "parts": [
                {
                    "mimeType": "text/plain",
                    "body": {"data": payload},
                }
            ],
        }
    }
    plain, html = google_oauth.extract_message_body(msg)
    assert plain == "hello world"
    assert html == ""


def test_message_headers_lowercases_keys():
    msg = {
        "payload": {
            "headers": [
                {"name": "From", "value": "info@easyequities.co.za"},
                {"name": "Subject", "value": "Confirmation of your transaction"},
            ]
        }
    }
    h = google_oauth.message_headers(msg)
    assert h["from"] == "info@easyequities.co.za"
    assert h["subject"] == "Confirmation of your transaction"
