import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Enum, ForeignKey, JSON,
    Boolean, UniqueConstraint
)
from sqlalchemy.orm import relationship

from database import Base


# --- Enums ---

class AccountType(str, enum.Enum):
    ZAR = "ZAR"
    TFSA = "TFSA"
    USD = "USD"
    SATRIX = "SATRIX"
    PROPERTY = "PROPERTY"
    CRYPTO = "CRYPTO"


class EventType(str, enum.Enum):
    added_stock = "added_stock"
    removed_stock = "removed_stock"
    new_thesis = "new_thesis"
    new_comment = "new_comment"
    new_note = "new_note"
    new_follow = "new_follow"


class Tier(str, enum.Enum):
    public = "public"
    inner_circle = "inner_circle"
    vault = "vault"


class FollowStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    rejected = "rejected"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    expired = "expired"


def utcnow():
    return datetime.now(timezone.utc)


# --- Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    handle = Column(String, unique=True, nullable=True, index=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)

    linkedin_url = Column(String, nullable=True)
    twitter_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)

    ee_username_enc = Column(String, nullable=True)
    ee_password_enc = Column(String, nullable=True)

    has_onboarded = Column(Boolean, default=False)
    portfolio_imported_at = Column(DateTime, nullable=True)
    password_reset_token = Column(String, nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    tier_config = relationship("UserTierConfig", back_populates="user", uselist=False, cascade="all, delete-orphan")
    holdings = relationship("Holding", back_populates="user", cascade="all, delete-orphan")
    theses = relationship("Thesis", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    feed_events = relationship("FeedEvent", back_populates="user", cascade="all, delete-orphan")


class UserTierConfig(Base):
    __tablename__ = "user_tier_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    public_shows = Column(JSON, default=lambda: ["sectors", "return_pct"])
    inner_circle_shows = Column(JSON, default=lambda: ["stock_names", "allocation_pct", "all_theses", "all_notes", "comments"])
    vault_shows = Column(JSON, default=lambda: ["amounts", "buy_sell_history", "realtime_changes", "exclusive_theses", "exclusive_notes"])

    vault_price_cents = Column(Integer, default=0)
    auto_accept_followers = Column(Boolean, default=True)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="tier_config")


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    following_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tier = Column(Enum(Tier), default=Tier.inner_circle)
    status = Column(Enum(FollowStatus), default=FollowStatus.pending)
    is_vip = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    follower = relationship("User", foreign_keys=[follower_id])
    following = relationship("User", foreign_keys=[following_id])

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow"),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    subscriber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount_cents = Column(Integer, nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.active)
    started_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime, nullable=True)

    subscriber = relationship("User", foreign_keys=[subscriber_id])
    creator = relationship("User", foreign_keys=[creator_id])


class InstrumentMap(Base):
    __tablename__ = "instrument_map"

    id = Column(Integer, primary_key=True, index=True)
    ee_name = Column(String, nullable=False, index=True)
    ticker = Column(String, nullable=True)
    market = Column(String, default="JSE")
    instrument_type = Column(String, default="stock")  # stock, etf, ametf, unit_trust
    eodhd_symbol = Column(String, nullable=True)
    yfinance_symbol = Column(String, nullable=True)
    scrape_source = Column(String, nullable=True)  # moneyweb, allangray, easyetfs, coronation
    scrape_code = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)


class ScrapedPrice(Base):
    __tablename__ = "scraped_prices"

    id = Column(Integer, primary_key=True, index=True)
    instrument_code = Column(String, nullable=False)
    instrument_name = Column(String, nullable=False)
    nav_price = Column(Float, nullable=True)
    nav_date = Column(DateTime, nullable=True)
    source = Column(String, nullable=False)
    scraped_at = Column(DateTime, default=utcnow)


class PriceAnomaly(Base):
    __tablename__ = "price_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    stock_name = Column(String, nullable=False)
    source = Column(String, nullable=False)
    returned_price = Column(Float)
    avg_buy_price = Column(Float)
    implied_pnl_pct = Column(Float)
    flagged_at = Column(DateTime, default=utcnow)


class UserTransaction(Base):
    __tablename__ = "user_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # "buy" or "sell"
    stock_name = Column(String, nullable=False)
    contract_code = Column(String, nullable=True)
    account_type = Column(String, nullable=False, default="ZAR")
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=True)  # per share
    amount = Column(Float, nullable=True)  # total cost (private)
    transaction_date = Column(DateTime, nullable=True)
    import_hash = Column(String, nullable=True)  # for dedup on re-import
    shared_count = Column(Integer, default=0)  # how many times shared to feed
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "import_hash", name="uq_user_transaction_hash"),
    )


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)

    stock_name = Column(String, nullable=False)
    contract_code = Column(String, nullable=False)
    isin = Column(String, nullable=True)

    purchase_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    shares = Column(Float, nullable=True)

    logo_url = Column(String, nullable=True)
    last_synced_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="holdings")


class StockFollow(Base):
    __tablename__ = "stock_follows"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contract_code = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "contract_code", name="uq_stock_follow"),
    )


class InvestmentReason(Base):
    __tablename__ = "investment_reasons"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contract_code = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)
    reasons = Column(JSON, default=list)  # preset reason tags
    free_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")


class Thesis(Base):
    __tablename__ = "theses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contract_code = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    visibility = Column(Enum(Tier), default=Tier.inner_circle)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="theses")
    comments = relationship("Comment", back_populates="thesis", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    thesis = relationship("Thesis", back_populates="comments")
    user = relationship("User", back_populates="comments")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    visibility = Column(Enum(Tier), default=Tier.public)

    stock_tag = Column(String, nullable=True)
    stock_name = Column(String, nullable=True)
    transaction_ids = Column(JSON, nullable=True)  # array of UserTransaction IDs
    image_url = Column(String, nullable=True)
    parent_note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    like_count = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    reshare_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="notes")
    parent = relationship("Note", remote_side=[id], backref="replies")
    likes = relationship("NoteLike", back_populates="note", cascade="all, delete-orphan")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # "buy" or "sell"
    stock_name = Column(String, nullable=False)
    ticker = Column(String, nullable=True)
    market = Column(String, nullable=False, default="JSE")
    account_type = Column(String, nullable=True)
    trade_date = Column(DateTime, nullable=True)
    amount_private = Column(Float, nullable=True)  # NEVER exposed via API
    share_price_private = Column(Float, nullable=True)  # NEVER exposed
    shares_private = Column(Float, nullable=True)  # NEVER exposed
    screenshot_url = Column(String, nullable=True)
    ai_confidence = Column(String, nullable=True)
    ai_raw_response = Column(JSON, nullable=True)
    visibility = Column(Enum(Tier), default=Tier.public)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")
    note = relationship("Note", foreign_keys=[note_id])


class NoteLike(Base):
    __tablename__ = "note_likes"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    note = relationship("Note", back_populates="likes")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("note_id", "user_id", name="uq_note_like"),
    )


class SavedNote(Base):
    __tablename__ = "saved_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")
    note = relationship("Note")

    __table_args__ = (
        UniqueConstraint("user_id", "note_id", name="uq_saved_note"),
    )


class NoteReshare(Base):
    __tablename__ = "note_reshares"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")
    note = relationship("Note")

    __table_args__ = (
        UniqueConstraint("user_id", "note_id", name="uq_note_reshare"),
    )


class FeedEvent(Base):
    __tablename__ = "feed_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_type = Column(Enum(EventType), nullable=False)
    visibility = Column(Enum(Tier), default=Tier.public)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="feed_events")


class StockSummaryCache(Base):
    __tablename__ = "stock_summary_cache"

    contract_code = Column(String, primary_key=True)
    summary_text = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=utcnow)
