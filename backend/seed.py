"""
Seed the database with demo profiles and data.
Run: python seed.py
"""

import os
os.environ.setdefault("SHAREZ_FERNET_KEY", "demo-key-not-for-production-use-only")

from database import engine, Base, SessionLocal
from models import (
    User, UserTierConfig, Holding, Thesis, Note, Follow, FeedEvent,
    AccountType, Tier, FollowStatus, EventType
)
from auth import hash_password

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Check if already seeded
if db.query(User).first():
    print("Database already seeded. Skipping.")
    db.close()
    exit()

print("Seeding database...")

# --- Users ---
thabo = User(
    email="thabo@sharez.co.za",
    password_hash=hash_password("demo1234"),
    display_name="Thabo Mokoena",
    bio="JSE value investor. Long-term holds only. TFSA maxxer.",
    linkedin_url="https://linkedin.com/in/thabomokoena",
    twitter_url="https://x.com/thabo_invests",
    has_onboarded=True,
)
sarah = User(
    email="sarah@sharez.co.za",
    password_hash=hash_password("demo1234"),
    display_name="Sarah van der Merwe",
    bio="Growth-focused. Love discovering under-the-radar SA stocks.",
    linkedin_url="https://linkedin.com/in/sarahvdm",
    website_url="https://sarahinvests.co.za",
    has_onboarded=True,
)
lebo = User(
    email="lebo@sharez.co.za",
    password_hash=hash_password("demo1234"),
    display_name="Lebo Dlamini",
    bio="Dividend hunter. Building passive income one stock at a time.",
    twitter_url="https://x.com/lebo_dividends",
    has_onboarded=True,
)

db.add_all([thabo, sarah, lebo])
db.flush()

# --- Tier Configs ---
thabo_config = UserTierConfig(
    user_id=thabo.id,
    public_shows=["sectors", "return_pct", "stock_names", "free_notes"],
    inner_circle_shows=["stock_names", "allocation_pct", "all_theses", "all_notes", "comments"],
    vault_shows=["amounts", "buy_sell_history", "realtime_changes", "exclusive_theses", "exclusive_notes"],
    vault_price_cents=9900,  # R99/month
    auto_accept_followers=True,
)
sarah_config = UserTierConfig(
    user_id=sarah.id,
    public_shows=["sectors", "return_pct", "free_notes"],
    inner_circle_shows=["stock_names", "allocation_pct", "all_theses", "all_notes"],
    vault_shows=["amounts", "buy_sell_history", "exclusive_theses", "exclusive_notes"],
    vault_price_cents=4900,  # R49/month
    auto_accept_followers=True,
)
lebo_config = UserTierConfig(
    user_id=lebo.id,
    public_shows=["sectors", "return_pct", "stock_names", "free_notes", "free_theses"],
    inner_circle_shows=["stock_names", "allocation_pct", "all_theses", "all_notes", "comments"],
    vault_shows=["amounts", "buy_sell_history", "realtime_changes", "exclusive_theses", "exclusive_notes"],
    vault_price_cents=0,  # Invite-only vault
    auto_accept_followers=False,
)

db.add_all([thabo_config, sarah_config, lebo_config])

# --- Holdings ---
# Thabo's portfolio (TFSA + ZAR)
thabo_holdings = [
    Holding(user_id=thabo.id, account_type=AccountType.TFSA, stock_name="Capitec Bank", contract_code="EQ0000000CPT", isin="ZAE000035861", purchase_value=15000, current_value=18500, current_price=2450, shares=7.55),
    Holding(user_id=thabo.id, account_type=AccountType.ZAR, stock_name="Naspers", contract_code="EQ0000000NPN", isin="ZAE000015889", purchase_value=25000, current_value=22000, current_price=3200, shares=6.875),
    Holding(user_id=thabo.id, account_type=AccountType.ZAR, stock_name="Standard Bank", contract_code="EQ0000000SBK", isin="ZAE000109815", purchase_value=10000, current_value=12300, current_price=185.50, shares=66.31),
    Holding(user_id=thabo.id, account_type=AccountType.TFSA, stock_name="Shoprite", contract_code="EQ0000000SHP", isin="ZAE000012084", purchase_value=8000, current_value=9200, current_price=270, shares=34.07),
]

# Sarah's portfolio
sarah_holdings = [
    Holding(user_id=sarah.id, account_type=AccountType.TFSA, stock_name="Discovery", contract_code="EQ0000000DSY", purchase_value=12000, current_value=15800, current_price=142, shares=111.27),
    Holding(user_id=sarah.id, account_type=AccountType.ZAR, stock_name="MTN", contract_code="EQ0000000MTN", purchase_value=8000, current_value=7200, current_price=95, shares=75.79),
    Holding(user_id=sarah.id, account_type=AccountType.TFSA, stock_name="Clicks Group", contract_code="EQ0000000CLS", purchase_value=10000, current_value=13500, current_price=310, shares=43.55),
    Holding(user_id=sarah.id, account_type=AccountType.ZAR, stock_name="Capitec Bank", contract_code="EQ0000000CPT", purchase_value=20000, current_value=24500, current_price=2450, shares=10),
]

# Lebo's portfolio (dividend stocks)
lebo_holdings = [
    Holding(user_id=lebo.id, account_type=AccountType.ZAR, stock_name="Absa Group", contract_code="EQ0000000ABG", purchase_value=15000, current_value=16800, current_price=195, shares=86.15),
    Holding(user_id=lebo.id, account_type=AccountType.ZAR, stock_name="Sanlam", contract_code="EQ0000000SLM", purchase_value=12000, current_value=14200, current_price=72, shares=197.22),
    Holding(user_id=lebo.id, account_type=AccountType.TFSA, stock_name="Woolworths", contract_code="EQ0000000WHL", purchase_value=9000, current_value=8200, current_price=52, shares=157.69),
    Holding(user_id=lebo.id, account_type=AccountType.ZAR, stock_name="Standard Bank", contract_code="EQ0000000SBK", purchase_value=18000, current_value=21500, current_price=185.50, shares=115.90),
    Holding(user_id=lebo.id, account_type=AccountType.TFSA, stock_name="Redefine Properties", contract_code="EQ0000000RDF", purchase_value=5000, current_value=5800, current_price=4.20, shares=1380.95),
]

db.add_all(thabo_holdings + sarah_holdings + lebo_holdings)

# --- Follows (Thabo ↔ Sarah, active) ---
db.add(Follow(follower_id=thabo.id, following_id=sarah.id, tier=Tier.inner_circle, status=FollowStatus.active))
db.add(Follow(follower_id=sarah.id, following_id=thabo.id, tier=Tier.inner_circle, status=FollowStatus.active))

# --- Notes ---
notes = [
    Note(user_id=thabo.id, body="Shoprite Q3 results just dropped. Revenue up 12%. This is why I'm long on SA retail.", visibility=Tier.public, stock_tag="EQ0000000SHP", stock_name="Shoprite", like_count=3),
    Note(user_id=thabo.id, body="Just topped up my TFSA for the month. Added more Capitec. The compounding on this one is beautiful.", visibility=Tier.inner_circle, stock_tag="EQ0000000CPT", stock_name="Capitec Bank", like_count=5),
    Note(user_id=sarah.id, body="Unpopular opinion: Naspers discount to NAV will never close. The Prosus structure makes it almost impossible.", visibility=Tier.public, stock_tag="EQ0000000NPN", stock_name="Naspers", like_count=8),
    Note(user_id=sarah.id, body="Discovery's Vitality model is genuinely world-class. No other insurer has anything like it. Long-term conviction hold.", visibility=Tier.public, stock_tag="EQ0000000DSY", stock_name="Discovery", like_count=4),
    Note(user_id=lebo.id, body="Who's watching the MPC rate decision tomorrow? If they cut, my REIT holdings are going to fly.", visibility=Tier.public, like_count=6),
    Note(user_id=lebo.id, body="R5 challenge: what's the best stock you can buy for under R5 a share? I'll start — Redefine Properties.", visibility=Tier.public, stock_tag="EQ0000000RDF", stock_name="Redefine Properties", like_count=12),
    Note(user_id=sarah.id, body="MTN is testing my patience. Down 10% since I bought. But the Africa growth story is still intact. Holding.", visibility=Tier.inner_circle, stock_tag="EQ0000000MTN", stock_name="MTN", like_count=2),
]
db.add_all(notes)

# --- Theses ---
theses = [
    Thesis(user_id=thabo.id, contract_code="EQ0000000CPT", stock_name="Capitec Bank", body="Capitec is the most innovative bank in SA. Their app is years ahead of the big four, their cost-to-income ratio is the lowest in the sector, and they're growing their client base faster than anyone. The TFSA is my biggest position because I believe this stock doubles in the next 5 years.", visibility=Tier.public),
    Thesis(user_id=thabo.id, contract_code="EQ0000000NPN", stock_name="Naspers", body="Naspers is a bet on Tencent at a significant discount. Yes, the discount has persisted for years, but at these levels you're essentially getting the rest of the Naspers portfolio for free. The risk is governance and the Prosus cross-holding structure, but I think the value is too compelling to ignore.", visibility=Tier.inner_circle),
    Thesis(user_id=sarah.id, contract_code="EQ0000000DSY", stock_name="Discovery", body="Discovery's moat is Vitality. No competitor has been able to replicate the shared-value insurance model at scale. The international expansion (Ping An Health in China, Vitality UK) gives it optionality that the market isn't pricing in. My biggest conviction hold.", visibility=Tier.public),
    Thesis(user_id=lebo.id, contract_code="EQ0000000SBK", stock_name="Standard Bank", body="Standard Bank is my favourite dividend stock on the JSE. The Africa franchise is unmatched, the ROE is consistently above 15%, and management has been disciplined about capital allocation. The dividend yield alone makes this worth holding.", visibility=Tier.public),
]
db.add_all(theses)
db.flush()

# --- Feed Events (transactions with notes) ---
# Thabo bought Shoprite
tx_note_1 = Note(user_id=thabo.id, body="Added Shoprite after seeing their Q3 numbers. Revenue growth of 12% in this economy? Take my money.", visibility=Tier.public, stock_tag="EQ0000000SHP", stock_name="Shoprite", like_count=7)
db.add(tx_note_1)
db.flush()

feed_events = [
    # Thabo's transactions
    FeedEvent(user_id=thabo.id, event_type=EventType.added_stock, visibility=Tier.public,
              metadata_={"stock_name": "Shoprite", "contract_code": "EQ0000000SHP"},
              note_id=tx_note_1.id),
    FeedEvent(user_id=thabo.id, event_type=EventType.added_stock, visibility=Tier.public,
              metadata_={"stock_name": "Capitec Bank", "contract_code": "EQ0000000CPT"}),
    FeedEvent(user_id=thabo.id, event_type=EventType.added_stock, visibility=Tier.inner_circle,
              metadata_={"stock_name": "Naspers", "contract_code": "EQ0000000NPN"}),

    # Sarah's transactions
    FeedEvent(user_id=sarah.id, event_type=EventType.added_stock, visibility=Tier.public,
              metadata_={"stock_name": "Discovery", "contract_code": "EQ0000000DSY"}),
    FeedEvent(user_id=sarah.id, event_type=EventType.added_stock, visibility=Tier.public,
              metadata_={"stock_name": "Capitec Bank", "contract_code": "EQ0000000CPT"}),
    FeedEvent(user_id=sarah.id, event_type=EventType.removed_stock, visibility=Tier.inner_circle,
              metadata_={"stock_name": "Sasol", "contract_code": "EQ0000000SOL"}),

    # Lebo's transactions
    FeedEvent(user_id=lebo.id, event_type=EventType.added_stock, visibility=Tier.public,
              metadata_={"stock_name": "Standard Bank", "contract_code": "EQ0000000SBK"}),
    FeedEvent(user_id=lebo.id, event_type=EventType.added_stock, visibility=Tier.public,
              metadata_={"stock_name": "Redefine Properties", "contract_code": "EQ0000000RDF"}),

    # Thesis events
    FeedEvent(user_id=thabo.id, event_type=EventType.new_thesis, visibility=Tier.public,
              metadata_={"thesis_id": 1, "stock_name": "Capitec Bank"}),
    FeedEvent(user_id=sarah.id, event_type=EventType.new_thesis, visibility=Tier.public,
              metadata_={"thesis_id": 3, "stock_name": "Discovery"}),
    FeedEvent(user_id=lebo.id, event_type=EventType.new_thesis, visibility=Tier.public,
              metadata_={"thesis_id": 4, "stock_name": "Standard Bank"}),

    # Note events
    FeedEvent(user_id=thabo.id, event_type=EventType.new_note, visibility=Tier.public,
              note_id=tx_note_1.id, metadata_={"stock_name": "Shoprite", "stock_tag": "EQ0000000SHP"}),
    FeedEvent(user_id=sarah.id, event_type=EventType.new_note, visibility=Tier.public,
              metadata_={"stock_name": "Naspers", "stock_tag": "EQ0000000NPN"}),
    FeedEvent(user_id=lebo.id, event_type=EventType.new_note, visibility=Tier.public,
              metadata_={"stock_name": "Redefine Properties", "stock_tag": "EQ0000000RDF"}),

    # Follows
    FeedEvent(user_id=thabo.id, event_type=EventType.new_follow, visibility=Tier.public,
              metadata_={"following_name": "Sarah van der Merwe", "following_id": 2}),
    FeedEvent(user_id=sarah.id, event_type=EventType.new_follow, visibility=Tier.public,
              metadata_={"following_name": "Thabo Mokoena", "following_id": 1}),
]
db.add_all(feed_events)

db.commit()
db.close()

print("Done! Seeded 3 users with portfolios, notes, and theses.")
print()
print("Demo accounts:")
print("  thabo@sharez.co.za  / demo1234  (public stock names, R99 vault)")
print("  sarah@sharez.co.za  / demo1234  (private stocks, R49 vault)")
print("  lebo@sharez.co.za   / demo1234  (open, invite-only vault)")
