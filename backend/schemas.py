from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# --- Auth ---

class UserCreate(BaseModel):
    email: str
    password: str
    display_name: str
    handle: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    display_name: str
    handle: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    has_onboarded: bool = False
    portfolio_imported_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    handle: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None


class UserProfile(BaseModel):
    id: int
    display_name: str
    handle: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    follower_count: int = 0
    following_count: int = 0
    your_tier: Optional[str] = None
    follow_status: Optional[str] = None
    vault_price_cents: int = 0
    auto_accept_followers: Optional[bool] = None
    vault_shows: Optional[list[str]] = None
    portfolio_imported_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- EasyEquities ---

class EECredentials(BaseModel):
    ee_username: str
    ee_password: str


# --- Holdings ---

class HoldingOut(BaseModel):
    id: int
    account_type: str
    stock_name: str
    contract_code: str
    isin: Optional[str] = None
    purchase_value: Optional[float] = None
    current_value: Optional[float] = None
    current_price: Optional[float] = None
    shares: Optional[float] = None
    logo_url: Optional[str] = None
    last_synced_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Tier Config ---

class TierConfigUpdate(BaseModel):
    public_shows: Optional[list[str]] = None
    inner_circle_shows: Optional[list[str]] = None
    vault_shows: Optional[list[str]] = None
    vault_price_cents: Optional[int] = None
    auto_accept_followers: Optional[bool] = None


class TierConfigOut(BaseModel):
    public_shows: list[str]
    inner_circle_shows: list[str]
    vault_shows: list[str]
    vault_price_cents: int
    auto_accept_followers: bool

    model_config = {"from_attributes": True}


# --- Follow ---

class FollowOut(BaseModel):
    id: int
    follower_id: int
    following_id: int
    tier: str
    status: str
    is_vip: bool
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Notes ---

class NoteCreate(BaseModel):
    body: str
    visibility: str = "public"
    stock_tag: Optional[str] = None
    stock_name: Optional[str] = None
    parent_note_id: Optional[int] = None


class NoteOut(BaseModel):
    id: int
    user_id: int
    display_name: Optional[str] = None
    handle: Optional[str] = None
    avatar_url: Optional[str] = None
    body: str
    visibility: str
    stock_tag: Optional[str] = None
    stock_name: Optional[str] = None
    parent_note_id: Optional[int] = None
    like_count: int = 0
    reply_count: int = 0
    liked_by_me: bool = False
    locked: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Theses ---

class ThesisCreate(BaseModel):
    contract_code: str
    stock_name: str
    body: str
    visibility: str = "inner_circle"


class ThesisUpdate(BaseModel):
    body: Optional[str] = None
    visibility: Optional[str] = None


class ThesisOut(BaseModel):
    id: int
    user_id: int
    display_name: Optional[str] = None
    contract_code: str
    stock_name: str
    body: str
    visibility: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Comments ---

class CommentCreate(BaseModel):
    body: str


class CommentOut(BaseModel):
    id: int
    thesis_id: int
    user_id: int
    display_name: Optional[str] = None
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Feed ---

class UnifiedFeedItem(BaseModel):
    item_type: str  # "note", "thesis", "transaction"
    id: int
    user_id: int
    display_name: Optional[str] = None
    handle: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    visibility: Optional[str] = None
    # Note fields
    body: Optional[str] = None
    stock_tag: Optional[str] = None
    stock_name: Optional[str] = None
    like_count: Optional[int] = None
    reply_count: Optional[int] = None
    liked_by_me: Optional[bool] = None
    parent_note_id: Optional[int] = None
    # Thesis fields
    contract_code: Optional[str] = None
    # Transaction fields
    event_type: Optional[str] = None
    metadata: Optional[dict] = None

    model_config = {"from_attributes": True}


# --- Investment Reasons ---

class InvestmentReasonCreate(BaseModel):
    contract_code: str
    stock_name: str
    reasons: list[str] = []
    free_text: Optional[str] = None


class InvestmentReasonOut(BaseModel):
    id: int
    user_id: int
    contract_code: str
    stock_name: str
    reasons: list[str]
    free_text: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StockFollowOut(BaseModel):
    id: int
    contract_code: str
    stock_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ShareTransactionRequest(BaseModel):
    contract_code: str
    stock_name: str
    transaction_type: str  # "buy" or "sell"
    note: Optional[str] = None  # optional note to attach


# --- Trades ---

class TradeExtraction(BaseModel):
    action: Optional[str] = None
    stock_name: Optional[str] = None
    ticker: Optional[str] = None
    date: Optional[str] = None
    account_type: Optional[str] = None
    amount_zar: Optional[float] = None
    share_price: Optional[float] = None
    shares: Optional[float] = None
    confidence: str = "low"
    error: Optional[str] = None


class TradeCreate(BaseModel):
    action: str
    stock_name: str
    ticker: Optional[str] = None
    market: str = "JSE"
    account_type: Optional[str] = None
    trade_date: Optional[str] = None
    amount_private: Optional[float] = None
    share_price_private: Optional[float] = None
    shares_private: Optional[float] = None
    screenshot_url: Optional[str] = None
    ai_confidence: Optional[str] = None
    visibility: str = "public"
    note_body: Optional[str] = None


class TradeOut(BaseModel):
    id: int
    user_id: int
    display_name: Optional[str] = None
    handle: Optional[str] = None
    action: str
    stock_name: str
    ticker: Optional[str] = None
    market: str
    account_type: Optional[str] = None
    trade_date: Optional[datetime] = None
    is_verified: bool = False
    ai_confidence: Optional[str] = None
    visibility: str = "public"
    note_body: Optional[str] = None
    note_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedEventOut(BaseModel):
    id: int
    user_id: int
    display_name: Optional[str] = None
    event_type: str
    visibility: str = "public"
    note_id: Optional[int] = None
    metadata: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Subscription ---

class SubscriptionOut(BaseModel):
    id: int
    subscriber_id: int
    creator_id: int
    amount_cents: int
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
