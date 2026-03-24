# Sharez — Product Requirements Document

**Last updated:** 2026-03-24

## Overview

**Sharez** is a social investing platform for South African retail investors. Users connect their EasyEquities brokerage accounts to sync verified portfolios, then share their holdings, investment notes, and AI-powered stock insights with followers. The platform uses a tiered access model (Public → Inner Circle → Vault) to let creators control what different audiences see.

**Target audience**: Young South African investors (20-35) who use EasyEquities and want to see what their friends and people they admire are actually investing in — not screenshots, but real, synced data.

**Core insight** (from Blossom): Verified portfolios are the value proposition. People come for the portfolios and stay for the conversation.

**Live URL:** https://sharez.onrender.com

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Database | Supabase (PostgreSQL) |
| Frontend | React (Vite), Tailwind CSS, Recharts, Lucide React |
| AI | Claude API (Sonnet 4) via Anthropic SDK |
| Market Data | EODHD API (JSE + US stocks), yfinance fallback |
| Auth | JWT tokens (python-jose), bcrypt password hashing |
| Encryption | Fernet (cryptography lib) for EE credentials |
| Hosting | Render.com (web service) |
| Repo | GitHub (meetfrank-ai/sharez, private) |

---

## Architecture

```
React Frontend (Vite) ──► FastAPI Backend ──► Supabase PostgreSQL
                              │
                              ├── Claude API (AI summaries)
                              ├── EODHD API (market data, prices, fundamentals)
                              └── EasyEquities (portfolio sync, unofficial client)
```

- **Frontend** built by Vite, served as static files from FastAPI in production
- **Database** on Supabase PostgreSQL via connection pooler
- **Market data** from EODHD (primary) with yfinance fallback
- **AI summaries** cached 4 hours, auto-clear stale entries

---

## Data Models (13 tables)

| Model | Purpose | Status |
|---|---|---|
| User | Core user: email, password, handle, bio, social links | ✅ Active |
| UserTierConfig | Per-user visibility settings for each tier | ✅ Active |
| Follow | Follower relationships with tier + status | ✅ Active |
| Subscription | Paid vault subscriptions | ✅ Active |
| Holding | Portfolio holdings synced from EasyEquities | ✅ Active |
| StockFollow | User's stock watchlist | ✅ Active |
| InvestmentReason | Why a user invested (preset tags + free text) | ✅ Active |
| Note | Short-form posts (500 char), threaded replies, likes | ✅ Active |
| NoteLike | Like tracking with unique constraint | ✅ Active |
| Thesis | Long-form investment write-ups | ⏸ Built, hidden from feed (v2) |
| Comment | Comments on theses | ⏸ Built, hidden (v2) |
| FeedEvent | Buy/sell transaction events | ✅ Active |
| StockSummaryCache | Cached AI summaries (4hr TTL) | ✅ Active |

---

## Features — What's Built (v1 MVP)

### Auth & Onboarding
- Email + password registration with **@handle** (3-20 alphanumeric)
- JWT token auth (1-week expiry)
- 3-step intro slides explaining the platform
- EasyEquities connection step (with skip option)
- Auto-follow 3 demo accounts on signup (new users see content immediately)

### Portfolio Sync
- Encrypted EE credential storage (Fernet)
- Unofficial EE client with demo data fallback
- After sync: user reviews detected buys/sells before sharing (not auto-broadcast)
- "Why are you investing?" prompt for new buys (preset reasons + free text)
- Feeds into "Why people invest" section on stock summaries

### Portfolio View
- **Own portfolio**: Summary cards (Total Value, Gain/Loss, Return %, Top Performer), holdings list, allocation donut chart
- **Viewing others**: Percentage-based only — no dollar amounts. Pie chart, holdings by weight, return %, dual-market split (JSE vs USD), account breakdown (TFSA/ZAR/USD), "Verified portfolio · Synced from EasyEquities" badge

### Follow System — 3 Tiers
- **Public**: anyone sees public content without following
- **Inner Circle**: follow request (free), pending approval unless auto-accept
- **Vault**: paid subscription, popup shows price + what's included
- Follow button states: Follow → Requested → Following ✓ → Vault Member
- VIP access grants (creator manually gives someone vault access)

### Unified Feed
- **"For you"** (blend): shows public content from everyone + inner circle/vault from followed. New users see content immediately.
- **"My community"**: only people you follow
- Content type filters: Notes | Transactions
- Shows actual content inline (not meta-events)
- Substack-style "What's on your mind?" composer
- Inline reply bar on notes (comment without leaving feed)

### Notes
- Short-form posts (500 char max)
- Optional stock tagging
- Visibility tiers (public/inner_circle/vault)
- Threading (replies inherit parent visibility)
- Like/unlike with counts
- Inline reply from feed + full thread view

### Rich AI Stock Summary
- **Stock header**: Ticker badge (teal JSE / blue US), company name, exchange · sector, price, daily change
- **SVG sparkline**: 1-year price chart with line + fill
- **Community bar**: # holding · # bought recently · # sold recently, avatar stack of followers who hold this stock
- **AI Summary card** (Claude API):
  - Quick take with historical performance context (1m/3m/6m/1yr moves)
  - Sentiment pills (bullish/caution/neutral)
  - Why people invest (aggregated from investment reasons + thesis keywords)
  - Key metrics (3 most relevant, AI-selected)
  - News digest (rewritten headlines)
  - Risk note (financial risks only, not community size)
- **"Updated X ago"** timestamp
- **Follow stock + Share** action buttons
- Sort/filter per tab: Recent/Oldest, user/Following/Everyone

### Watchlist
- Dedicated page in sidebar with bookmark icon
- Follow/unfollow stocks from stock detail page
- Alphabetical list linking to stock pages

### User Profiles
- Display name, @handle, bio, social links (LinkedIn, Twitter, website)
- Tabs: Portfolio | Notes
- Percentage-based portfolio view for followers
- Follower/following counts
- Tier badge showing viewer's access level

### Discover
- Search by name or @handle
- Creator cards with follower count, bio preview
- Follow button with tier awareness

### Tier Settings
- Accordion UI per tier (Public / Inner Circle / Vault)
- Grouped checkboxes: Portfolio Data, Activity, Content
- "Preview as follower" button shows what each tier sees
- Auto-accept toggle (Inner Circle)
- Vault pricing + manual approval toggle

### Connections Management
- Tier filter pills: All | Requests | Inner Circle | Vault
- Pending requests: approve/reject
- Inner Circle followers: VIP upgrade button
- Vault members: VIP badge
- Following tab with tier indicators

### Deployment & Infrastructure
- Render.com web service with auto-deploy from GitHub
- Supabase PostgreSQL (connection pooler)
- Render API integration for env var management
- Build: npm + pip install → Vite build → copy to backend/static
- Auto-seed demo data on empty database

---

## Features — v2 Roadmap

### Articles (formerly Theses)
- Substack-style long-form investment write-ups
- AI-assisted writing: pre-fills context from holdings
- Paywalled exclusive articles for Vault subscribers
- Comments system
- Backend models exist, hidden from feed in v1

### Google OAuth
- Gmail sign-in alongside email/password
- Supabase Auth integration

### Shareable Portfolio Cards
- Export designed image: "My portfolio is up 14% this year"
- Portfolio milestones: "Just hit R100k invested"
- Optimized for Instagram/TikTok sharing

### Dividend Tracking
- Monthly/annual dividend income
- Per-stock dividend breakdown
- Annual dividend forecast

### Stock Community Data (passive social proof)
- "Held by 12 people in your network, avg allocation 8%"
- Holdings increasing/decreasing trend

### Notifications
- "Sarah replied to your note about Capitec"
- "Thabo just added Naspers"
- Push notifications (web + mobile)

### EODHD Upgrade
- Real-time quotes (paid tier)
- Full fundamentals for all JSE stocks
- Better news coverage

### Background Portfolio Sync
- Cron job for periodic sync
- Event-driven on major price moves

---

## API Endpoints (28 total)

### Auth (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register with email, password, handle |
| POST | `/login` | Login, returns JWT |
| GET | `/me` | Current user profile |
| POST | `/complete-onboarding` | Mark onboarding done |
| PUT | `/profile` | Update profile (name, bio, links) |

### Portfolio (`/api/portfolio`)
| Method | Path | Description |
|---|---|---|
| POST | `/connect-ee` | Connect EasyEquities + sync |
| POST | `/sync` | Manual portfolio sync |
| GET | `/me` | My holdings |
| GET | `/user/{id}` | User holdings (tier-filtered) |
| PUT | `/tier-config` | Update tier settings |
| GET | `/tier-config` | Get tier settings |
| POST | `/investment-reason` | Save why invested |
| POST | `/follow-stock/{code}` | Follow a stock |
| DELETE | `/follow-stock/{code}` | Unfollow a stock |
| GET | `/followed-stocks` | My watchlist |
| GET | `/followed-stocks/{id}` | User's watchlist |
| POST | `/share-transaction` | Share buy/sell with note |

### Follow (`/api`)
| Method | Path | Description |
|---|---|---|
| POST | `/follow/{id}` | Follow a user |
| DELETE | `/follow/{id}` | Unfollow |
| PUT | `/follow/{id}/approve` | Approve follow request |
| PUT | `/follow/{id}/reject` | Reject follow request |
| PUT | `/follow/{id}/grant-vip` | Grant VIP vault access |
| GET | `/followers` | My followers |
| GET | `/following` | Who I follow |
| GET | `/profile/{id}` | User profile with tier info |
| POST | `/subscribe/{id}` | Vault subscription |
| DELETE | `/subscribe/{id}` | Cancel subscription |

### Feed (`/api/feed`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Unified feed (notes + transactions) |
| GET | `/stock-summary` | AI stock summary |

### Notes (`/api/notes`)
| Method | Path | Description |
|---|---|---|
| POST | `/` | Create note |
| GET | `/user/{id}` | User's notes |
| GET | `/{id}/thread` | Note thread |
| POST | `/{id}/like` | Like note |
| DELETE | `/{id}/like` | Unlike note |
| GET | `/stock/{code}` | Notes for stock |

### Discover (`/api/discover`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Search/browse users |

---

## Demo Accounts

| Name | Email | Handle | Password |
|---|---|---|---|
| Thabo Mokoena | thabo@sharez.co.za | @thabo | demo1234 |
| Sarah van der Merwe | sarah@sharez.co.za | @sarahvdm | demo1234 |
| Lebo Dlamini | lebo@sharez.co.za | @lebo_dividends | demo1234 |

---

## Environment Variables (Render)

| Key | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (pooler) |
| `SHAREZ_SECRET_KEY` | JWT signing key |
| `SHAREZ_FERNET_KEY` | Encryption key for EE credentials |
| `ANTHROPIC_API_KEY` | Claude API key for AI summaries |
| `EODHD_API_KEY` | EODHD market data API key |
| `PYTHON_VERSION` | `3.11.11` |
| `NODE_VERSION` | `20` |

---

## File Structure

```
sharez/
├── backend/
│   ├── main.py              # FastAPI app, table creation, seeding
│   ├── database.py          # SQLAlchemy engine (Supabase PostgreSQL)
│   ├── models.py            # 13 SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT + password hashing
│   ├── tier_access.py       # Tier hierarchy + access checks
│   ├── ee_sync.py           # EasyEquities sync + encryption
│   ├── ai_summary.py        # Claude API + EODHD stock summaries
│   ├── seed.py              # Demo data seeder
│   ├── start.py             # Production startup script
│   ├── requirements.txt     # Python dependencies
│   └── routes/
│       ├── auth.py           # 5 endpoints
│       ├── portfolio.py      # 11 endpoints
│       ├── follow.py         # 9 endpoints
│       ├── feed.py           # 2 endpoints
│       ├── notes.py          # 6 endpoints
│       ├── theses.py         # 5 endpoints (v2, partially hidden)
│       ├── comments.py       # 2 endpoints (v2, hidden)
│       └── discover.py       # 1 endpoint
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Router + auth provider
│   │   ├── pages/            # 12 page components
│   │   ├── components/       # 11 shared components
│   │   ├── hooks/useAuth.jsx # Auth context + token management
│   │   └── utils/api.js      # Axios instance with JWT interceptor
│   ├── vite.config.js
│   └── package.json
├── build.sh                  # Render build script
├── render.yaml               # Render deployment config
├── PRD.md                    # This document
└── SPEC.md                   # Original project spec (historical)
```
