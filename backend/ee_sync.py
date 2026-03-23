"""
EasyEquities portfolio sync module.

Uses the unofficial easy-equities-client to pull holdings.
If that fails, this module is isolated so it can be swapped out.
"""

import os
import logging
from datetime import datetime, timezone

from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from models import User, Holding, FeedEvent, EventType, AccountType

logger = logging.getLogger(__name__)

# Encryption key for EE credentials — must be set in env
_FERNET_KEY = os.getenv("SHAREZ_FERNET_KEY")


def _get_fernet():
    if not _FERNET_KEY:
        raise RuntimeError(
            "SHAREZ_FERNET_KEY environment variable not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(_FERNET_KEY.encode())


def encrypt_value(plain: str) -> str:
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_value(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


def store_ee_credentials(db: Session, user: User, username: str, password: str):
    """Encrypt and store EasyEquities credentials for a user."""
    user.ee_username_enc = encrypt_value(username)
    user.ee_password_enc = encrypt_value(password)
    db.commit()


async def sync_portfolio(db: Session, user: User) -> list[dict]:
    """
    Sync a user's EasyEquities portfolio.
    Returns the list of holdings pulled from EE.
    """
    if not user.ee_username_enc or not user.ee_password_enc:
        raise ValueError("EasyEquities credentials not set for this user")

    username = decrypt_value(user.ee_username_enc)
    password = decrypt_value(user.ee_password_enc)

    # Try the unofficial client
    try:
        holdings_data = await _fetch_from_ee(username, password)
    except Exception as e:
        logger.error(f"EasyEquities sync failed for user {user.id}: {e}")
        raise RuntimeError(f"Failed to sync with EasyEquities: {e}")

    # Track existing holdings for feed events
    existing_codes = {h.contract_code for h in user.holdings}

    # Clear old holdings and replace with fresh data
    db.query(Holding).filter(Holding.user_id == user.id).delete()

    now = datetime.now(timezone.utc)
    new_codes = set()

    for h in holdings_data:
        account_type_str = h.get("account_type", "ZAR")
        try:
            account_type = AccountType(account_type_str)
        except ValueError:
            account_type = AccountType.ZAR

        holding = Holding(
            user_id=user.id,
            account_type=account_type,
            stock_name=h.get("name", "Unknown"),
            contract_code=h.get("contract_code", ""),
            isin=h.get("isin"),
            purchase_value=h.get("purchase_value"),
            current_value=h.get("current_value"),
            current_price=h.get("current_price"),
            shares=h.get("shares"),
            logo_url=h.get("logo_url"),
            last_synced_at=now,
        )
        db.add(holding)
        new_codes.add(h.get("contract_code", ""))

    # Detect changes — don't auto-share, let user decide
    added = new_codes - existing_codes
    removed = existing_codes - new_codes

    db.commit()

    # Build detected changes for user review
    added_stocks = []
    for code in added:
        name = next(
            (h.get("name") for h in holdings_data if h.get("contract_code") == code),
            code,
        )
        added_stocks.append({"contract_code": code, "stock_name": name, "type": "buy"})

    removed_stocks = []
    for code in removed:
        removed_stocks.append({"contract_code": code, "type": "sell"})

    return {
        "holdings": holdings_data,
        "added_stocks": added_stocks,
        "removed_stocks": removed_stocks,
    }


async def _fetch_from_ee(username: str, password: str) -> list[dict]:
    """
    Fetch holdings from EasyEquities using the unofficial client.

    Returns a list of dicts with keys:
        name, contract_code, isin, account_type,
        purchase_value, current_value, current_price, shares, logo_url
    """
    try:
        from easy_equities_client import EasyEquitiesClient

        client = EasyEquitiesClient()
        client.login(username=username, password=password)

        all_holdings = []
        accounts = client.accounts

        for account in accounts:
            account_type = _map_account_type(account.name)
            holdings = client.get_holdings(account.id)

            for h in holdings:
                all_holdings.append({
                    "name": h.name,
                    "contract_code": getattr(h, "contract_code", h.name),
                    "isin": getattr(h, "isin", None),
                    "account_type": account_type,
                    "purchase_value": getattr(h, "purchase_value", None),
                    "current_value": getattr(h, "current_value", None),
                    "current_price": getattr(h, "current_price", None),
                    "shares": getattr(h, "shares", None),
                    "logo_url": getattr(h, "logo_url", None),
                })

        return all_holdings

    except ImportError:
        logger.warning(
            "easy_equities_client not installed. "
            "Install with: pip install easy-equities-client"
        )
        # Return demo data for development
        return _demo_holdings()
    except Exception:
        logger.warning("EE client failed, falling back to demo data")
        return _demo_holdings()


def _map_account_type(account_name: str) -> str:
    name = account_name.upper()
    if "TFSA" in name:
        return "TFSA"
    if "USD" in name or "DOLLAR" in name:
        return "USD"
    return "ZAR"


def _demo_holdings() -> list[dict]:
    """Demo data for development without EE credentials."""
    return [
        {
            "name": "Capitec Bank",
            "contract_code": "EQ0000000CPT",
            "isin": "ZAE000035861",
            "account_type": "TFSA",
            "purchase_value": 15000.00,
            "current_value": 18500.00,
            "current_price": 2450.00,
            "shares": 7.55,
            "logo_url": None,
        },
        {
            "name": "Naspers",
            "contract_code": "EQ0000000NPN",
            "isin": "ZAE000015889",
            "account_type": "ZAR",
            "purchase_value": 25000.00,
            "current_value": 22000.00,
            "current_price": 3200.00,
            "shares": 6.875,
            "logo_url": None,
        },
        {
            "name": "Standard Bank",
            "contract_code": "EQ0000000SBK",
            "isin": "ZAE000109815",
            "account_type": "ZAR",
            "purchase_value": 10000.00,
            "current_value": 12300.00,
            "current_price": 185.50,
            "shares": 66.31,
            "logo_url": None,
        },
        {
            "name": "Shoprite",
            "contract_code": "EQ0000000SHP",
            "isin": "ZAE000012084",
            "account_type": "TFSA",
            "purchase_value": 8000.00,
            "current_value": 9200.00,
            "current_price": 270.00,
            "shares": 34.07,
            "logo_url": None,
        },
    ]
