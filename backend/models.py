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
    inner_circle = "inner_circle"  # kept for DB compatibility, treated same as public
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

    # Gmail integration — replaces the old EE credential scrape (removed 2026-05).
    google_email = Column(String, nullable=True, index=True)
    gmail_refresh_token_enc = Column(Text, nullable=True)
    gmail_last_synced_at = Column(DateTime, nullable=True)
    gmail_history_id = Column(String, nullable=True)

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
    show_on_rank = Column(Boolean, default=True)  # opt-out of public leaderboard (D-6)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="tier_config")


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tier = Column(Enum(Tier), default=Tier.inner_circle)
    status = Column(Enum(FollowStatus), default=FollowStatus.pending, index=True)
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
    fundsdata_code = Column(String, nullable=True)
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


class HistoricalPrice(Base):
    __tablename__ = "historical_prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)  # e.g. PRX.JSE, AGOGE.JSE
    price_date = Column(DateTime, nullable=False)
    close_price = Column(Float, nullable=False)
    source = Column(String, nullable=False, default="eodhd")  # eodhd, yfinance, fundsdata
    currency = Column(String, default="ZAR")
    fetched_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("symbol", "price_date", name="uq_hist_price_symbol_date"),
    )


class UserTransaction(Base):
    __tablename__ = "user_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String, nullable=False)  # "buy" or "sell"
    stock_name = Column(String, nullable=False)
    contract_code = Column(String, nullable=True)
    account_type = Column(String, nullable=False, default="ZAR")
    broker_name = Column(String, nullable=True)  # "EasyEquities" / future: "Outlook-EE", etc.
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=True)  # per share
    amount = Column(Float, nullable=True)  # total cost (private)
    transaction_date = Column(DateTime, nullable=True)
    is_opening_position = Column(Boolean, default=False)  # first trade for this user+stock
    # Owner-only display preference for the Transactions page (D-7 refinement).
    # null = use account_type native currency; "rand" / "usd" / "pct" override per row.
    display_mode = Column(String, nullable=True)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_type = Column(Enum(AccountType), nullable=False)

    stock_name = Column(String, nullable=False)
    contract_code = Column(String, nullable=False)
    isin = Column(String, nullable=True)

    purchase_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    shares = Column(Float, nullable=True)
    external_avg_buy_price = Column(Float, nullable=True)  # from EODHD/FundsData historical
    price_source = Column(String, nullable=True)  # eodhd, yfinance, fundsdata, scrape

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
    title = Column(String, nullable=True)  # used by challenge picks
    body = Column(Text, nullable=False)
    visibility = Column(Enum(Tier), default=Tier.inner_circle)

    # Crystal Ball / future challenges. challenge_id+is_locked makes a thesis
    # immutable (body cannot change; updates go through ThesisUpdate).
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=True, index=True)
    is_locked = Column(Boolean, default=False)
    locked_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="theses")
    comments = relationship("Comment", back_populates="thesis", cascade="all, delete-orphan")
    updates = relationship("ThesisUpdate", back_populates="thesis", cascade="all, delete-orphan", order_by="ThesisUpdate.created_at")


class ThesisUpdate(Base):
    """
    Append-only updates on an immutable thesis. Used both for general theses
    (when authors want to add an "update from Q1" note) and for the Crystal
    Ball quarterly update prompts. Original thesis body never changes.
    """
    __tablename__ = "thesis_updates"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id"), nullable=False, index=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    thesis = relationship("Thesis", back_populates="updates")


class Challenge(Base):
    """
    Crystal Ball Challenge (and future user-created challenges). Every
    challenge entry is structurally five Theses with the same challenge_id
    + locked_at + is_locked=True.
    """
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    pick_count = Column(Integer, default=5)
    max_participants = Column(Integer, default=500)
    market = Column(String, default="JSE")  # restrict pick universe
    lockup_at = Column(DateTime, nullable=False)  # picks must be in by this time
    end_at = Column(DateTime, nullable=False)
    is_public_view = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)


class ChallengeParticipant(Base):
    __tablename__ = "challenge_participants"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    joined_at = Column(DateTime, default=utcnow)
    picks_locked = Column(Boolean, default=False)  # set true once 5 theses exist & lockup passes
    return_pct = Column(Float, nullable=True)  # latest snapshot, refreshed daily

    __table_args__ = (
        UniqueConstraint("challenge_id", "user_id", name="uq_challenge_participant"),
    )


class ChallengeInvite(Base):
    """
    Per-invite-code tracking. Each beta user gets ~4 codes; Sharez allocates
    100 directly. Invite consumed when used_by is set; expires once
    the challenge's lockup passes.
    """
    __tablename__ = "challenge_invites"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    issued_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)


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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    body = Column(Text, nullable=False)
    visibility = Column(Enum(Tier), default=Tier.public)

    stock_tag = Column(String, nullable=True)
    stock_name = Column(String, nullable=True)
    transaction_ids = Column(JSON, nullable=True)  # array of UserTransaction IDs
    image_url = Column(String, nullable=True)
    parent_note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    trade_linked = Column(Boolean, default=False)  # True = only renders inside parent TradeCard
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
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


class UserReturnsSnapshot(Base):
    """
    Daily snapshot of a user's portfolio returns (% only, never amounts).
    Refreshed by scraper_job. Used for the public Rank/leaderboard.
    """
    __tablename__ = "user_returns_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    snapshot_date = Column(DateTime, nullable=False, index=True)
    return_7d_pct = Column(Float, nullable=True)
    return_30d_pct = Column(Float, nullable=True)
    return_all_pct = Column(Float, nullable=True)
    holding_count = Column(Integer, nullable=True)
    top_contract_code = Column(String, nullable=True)
    top_stock_name = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_date", name="uq_user_returns_day"),
    )


class PriceAlert(Base):
    """User-set crossing alerts on a stock's price."""
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    contract_code = Column(String, nullable=True)
    eodhd_symbol = Column(String, nullable=True, index=True)
    stock_name = Column(String, nullable=False)
    direction = Column(String, nullable=False)  # "above" | "below"
    threshold_price = Column(Float, nullable=False)
    currency = Column(String, default="ZAR")
    last_triggered_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=utcnow)


class Notification(Base):
    """
    In-app notifications surfaced in the bell dropdown. Polymorphic via
    target_kind + target_id so we can notify on any object type without
    foreign-key sprawl.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    kind = Column(String, nullable=False)  # follow / follow_request / note_like / note_reply / trade_react / gmail_synced
    target_kind = Column(String, nullable=True)  # note / thesis / feed_event / trade / user
    target_id = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)


class OnboardingStep(Base):
    """
    Tracks per-user completion of the activation steps shown on the Feed
    onboarding card. One row per (user, step_key); presence == completed.
    """
    __tablename__ = "onboarding_steps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    step_key = Column(String, nullable=False)  # link_account / set_visibility / add_thesis / follow_someone / complete_profile
    completed_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "step_key", name="uq_onboarding_step"),
    )


class TradeReaction(Base):
    """
    Bull/Bear reactions on a feed-event-shaped trade. Polymorphic via target_kind
    so we can react on either a FeedEvent (shared transaction) or a Trade
    (verified screenshot trade) without two parallel tables.
    """
    __tablename__ = "trade_reactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    target_kind = Column(String, nullable=False)  # "feed_event" | "trade"
    target_id = Column(Integer, nullable=False, index=True)
    sentiment = Column(String, nullable=False)  # "bull" | "bear"
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "target_kind", "target_id", name="uq_trade_reaction"),
    )
