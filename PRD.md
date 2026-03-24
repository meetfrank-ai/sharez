# Sharez — Product Requirements Document

## Overview

**Sharez** is a social investing platform for South African retail investors. Users connect their EasyEquities brokerage accounts to sync verified portfolios, then share their holdings, investment theses, and short-form notes with followers. The platform uses a tiered access model (Public → Inner Circle → Vault) to let creators control what different audiences see.

**Target audience**: Young South African investors (20-35) who use EasyEquities and want to see what their friends and people they admire are actually investing in — not screenshots, but real, synced data.

**Core insight** (from Blossom): Verified portfolios are the value proposition. People come for the portfolios and stay for the conversation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy, SQLite |
| Frontend | React (Vite), Tailwind CSS, Recharts, Lucide React |
| AI | Claude API (Sonnet) via Anthropic SDK |
| Market Data | yfinance (Yahoo Finance) |
| Auth | JWT tokens (python-jose), bcrypt password hashing |
| Encryption | Fernet (cryptography lib) for EE credentials |
| Hosting | Render.com (web service + persistent disk) |
| Repo | GitHub (meetfrank-ai/sharez) |

---

## Architecture

```
React Frontend (Vite) ──► FastAPI Backend ──► SQLite Database
                              │                    │
                              ├── Claude API        │
                              ├── yfinance          │
                              └── EasyEquities      └── /opt/data/sharez.db
                                  (unofficial client)    (persistent disk)
```

**Frontend** is built by Vite and served as static files from the FastAPI backend in production. In development, Vite's dev server proxies `/api` calls to the backend.

**Database** uses SQLite on a Render persistent disk. Tables are created on startup via SQLAlchemy `create_all()`. Column migrations are handled by ALTER TABLE checks in `main.py`.

---

## Data Models

### User
- id, email, password_hash, display_name, **handle** (@username)
- avatar_url, bio, linkedin_url, twitter_url, website_url
- ee_username_enc, ee_password_enc (Fernet encrypted)
- has_onboarded (boolean)

### UserTierConfig
- Defines what each tier can see: public_shows, inner_circle_shows, vault_shows (JSON arrays)
- vault_price_cents (0 = invite-only)
- auto_accept_followers (boolean)

### Follow
- follower_id → following_id
- tier (public/inner_circle/vault), status (pending/active/rejected)
- is_vip (boolean — grants free vault access)

### Subscription
- subscriber_id → creator_id, amount_cents, status

### Holding (synced from EasyEquities)
- user_id, account_type (ZAR/TFSA/USD)
- stock_name, contract_code, isin
- purchase_value, current_value, current_price, shares, logo_url

### Note (short-form posts, max 500 chars)
- user_id, body, visibility (tier)
- stock_tag, stock_name (optional stock reference)
- parent_note_id (for threads), like_count, reply_count

### Thesis (long-form investment write-ups)
- user_id, contract_code, stock_name, body, visibility

### Comment (on theses)
- thesis_id, user_id, body

### FeedEvent (transactions only)
- user_id, event_type (added_stock/removed_stock), visibility
- metadata (JSON: stock_name, contract_code)

### StockSummaryCache
- contract_code, summary_text (JSON), generated_at (4-hour cache)

---

## Features — What's Built

### ✅ Auth & Onboarding
- Email + password registration with **@handle** (3-20 alphanumeric)
- JWT token auth (1-week expiry)
- 3-step intro slides explaining the platform
- EasyEquities connection step (with skip option + explanation)
- `has_onboarded` flag controls routing

### ✅ EasyEquities Portfolio Sync
- Encrypted credential storage (Fernet)
- Unofficial EE client integration with demo data fallback
- Sync detects new/removed holdings and creates FeedEvents
- Manual sync button on portfolio page

### ✅ Portfolio View
- Summary cards: Total Value, Total Gain/Loss, Return %, Top Performer
- Holdings list with stock logos, values, P&L percentages
- Allocation donut chart (Recharts)
- Tiered visibility: what others see depends on their access level

### ✅ Follow System — 3 Tiers
- **Public**: anyone sees public content without following
- **Inner Circle**: follow request (free), pending approval unless auto-accept
- **Vault**: paid subscription, popup shows price + what's included
- Follow button states: Follow → Requested → Following ✓ → Vault Member
- VIP access grants (creator manually gives someone vault access)

### ✅ Unified Feed
- Shows actual content inline (not meta-events):
  - **Notes** — full NoteCard with like/reply
  - **Transactions** — buy/sell cards with trending icons (user-initiated sharing)
- Filter tabs: For you | Notes | Transactions
- Server-side filtering, client-side search
- "What's on your mind?" composer (Substack-style)

### ✅ Notes
- Short-form posts (500 char max)
- Optional stock tagging
- Visibility tiers (public/inner_circle/vault)
- Threading (replies inherit parent visibility)
- Like/unlike with counts

### 🔲 Theses → v2: Articles (Substack-style)
- Deferred to v2 — will function like Substack articles for investing
- Long-form thoughtful pieces tied to stocks (not short-form notes)
- AI-assisted writing: pre-fills context from holdings ("You bought Capitec at R2,100")
- Paywalled exclusive articles for Vault subscribers
- Backend models exist (Thesis table) but hidden from UI in v1
- Comments system on articles

### ✅ Rich AI Stock Summary
- **Quick take**: 2-3 sentence plain-language summary (Claude API)
- **Sentiment pills**: community mood + thematic tags (bullish/caution/neutral)
- **Why people invest**: aggregated from platform theses (keyword extraction)
- **Key metrics**: AI-selected top 3 metrics (P/E, market cap, div yield, etc.)
- **News digest**: yfinance headlines rewritten by Claude
- **Risk note**: amber callout with the biggest risk
- **Community bar**: avatar stack of followers who hold the stock, holder count
- 4-hour cache on AI parts, community data always fresh
- Graceful fallback when no API key

### ✅ Stock Detail — Community View
- Sort: Recent / Oldest
- Filter: Everyone / People I follow
- When navigating from someone's profile → their stock, shows only their content (read-only)

### ✅ User Profiles
- Display name, @handle, bio, social links (LinkedIn, Twitter, website)
- Tabs: Portfolio | Theses | Notes
- Follower/following counts
- Tier badge showing your access level
- Editable in Settings

### ✅ Discover
- Search by name or handle
- Creator cards with follower count, bio preview
- Follow button with tier awareness

### ✅ Tier Settings
- Accordion UI per tier (Public / Inner Circle / Vault)
- Checkboxes for what each tier sees
- Auto-accept toggle (per Inner Circle)
- Vault pricing + manual approval toggle
- Save button

### ✅ Deployment
- Render.com with render.yaml blueprint
- Build script: installs Python + Node deps, builds React, copies to backend/static
- Auto-seeds 3 demo accounts on first deploy
- Persistent SQLite on /opt/data disk

---

## Features — Planned (Priority Order)

### 🔲 Google OAuth
- Gmail sign-in alongside email/password
- Google Cloud Console OAuth setup

### 🔲 Shareable Portfolio Cards
- Export a designed image card: "My portfolio is up 14% this year"
- Portfolio milestones: "Just hit R100k invested"
- Optimized for Instagram/TikTok sharing (free marketing)

### 🔲 Dividend Tracking
- Monthly/annual dividend income from synced holdings
- Per-stock dividend breakdown
- Annual dividend forecast

### 🔲 Stock Community Data (passive social proof)
- "Held by 12 people in your network, avg allocation 8%"
- Holdings increasing/decreasing trend
- Generated passively from synced portfolios

### 🔲 "Why are you investing?" prompt
- Optional step when adding a stock: preset reasons + free text
- Feeds the "Why people invest" section with real user data
- LLM clusters free-text into preset categories

### 🔲 Transaction → Attach Note
- When a buy/sell is detected, prompt user to write a note about it
- Links the note to the transaction in the feed

### 🔲 Simplified Tiers for MVP
- Consider reducing to just visible/private for initial launch
- Full 3-tier system for when monetisation demand exists

### 🔲 Financial Data API Upgrade
- Replace yfinance with Financial Modeling Prep or Polygon.io
- More reliable JSE data, better metrics coverage

### 🔲 Background Portfolio Sync
- Cron job to sync portfolios periodically (not just manual)
- Event-driven refresh on major price moves

### 🔲 Notifications
- "Sarah replied to your note about Capitec"
- "Thabo just added Naspers to their portfolio"
- Push notifications (web + mobile)

---

## Demo Accounts

| Name | Email | Handle | Password | Style |
|---|---|---|---|---|
| Thabo Mokoena | thabo@sharez.co.za | @thabo | demo1234 | Value investor, R99/mo vault |
| Sarah van der Merwe | sarah@sharez.co.za | @sarahvdm | demo1234 | Growth stocks, R49/mo vault |
| Lebo Dlamini | lebo@sharez.co.za | @lebo_dividends | demo1234 | Dividend hunter, invite-only vault |

---

## File Structure

```
sharez/
├── backend/
│   ├── main.py              # FastAPI app, table creation, migration, seeding
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # All SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT + password hashing
│   ├── tier_access.py       # Tier hierarchy + access checks
│   ├── ee_sync.py           # EasyEquities sync + encryption
│   ├── ai_summary.py        # Claude API + yfinance stock summaries
│   ├── seed.py              # Demo data seeder
│   ├── start.py             # Production startup script
│   ├── requirements.txt
│   └── routes/
│       ├── auth.py           # Register, login, profile update
│       ├── portfolio.py      # Holdings, EE connect, tier config
│       ├── follow.py         # Follow, unfollow, approve, VIP, subscribe
│       ├── feed.py           # Unified feed + stock summary
│       ├── notes.py          # Notes CRUD, likes, threads
│       ├── theses.py         # Theses CRUD
│       ├── comments.py       # Comments on theses
│       └── discover.py       # User search/browse
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/           # Feed, Portfolio, StockDetail, Profile, etc.
│   │   ├── components/      # NoteCard, ThesisCard, FollowButton, Layout, etc.
│   │   ├── hooks/useAuth.jsx
│   │   └── utils/api.js
│   ├── vite.config.js
│   └── package.json
├── build.sh                  # Render build script
├── render.yaml               # Render deployment config
├── PRD.md                    # This document
└── SPEC.md                   # Original project spec
```

---

## Environment Variables (Render)

| Key | Description |
|---|---|
| `SHAREZ_SECRET_KEY` | JWT signing key |
| `SHAREZ_FERNET_KEY` | Encryption key for EE credentials |
| `ANTHROPIC_API_KEY` | Claude API key for AI summaries |
| `DATA_DIR` | Path to persistent disk (`/opt/data`) |
| `PYTHON_VERSION` | `3.11.11` |
| `NODE_VERSION` | `20` |
