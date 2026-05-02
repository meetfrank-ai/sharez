"""
Shared pytest fixtures. Sets up stable env vars so the parser/oauth
modules can import without a real Render config.
"""

import os
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

os.environ.setdefault("SHAREZ_FERNET_KEY", "xhIzXQksAJ2lp9vmToFjLB-J0Yb40Jeza4-4yzMO8p4=")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmail/callback")
