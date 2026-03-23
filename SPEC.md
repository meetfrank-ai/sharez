# Claude Code Prompt: Stokvel — Social Investing for Friends

Copy everything below the line into Claude Code as your opening prompt.

---

## What I'm building

A social investing app for me and my friends in South Africa. We all use EasyEquities to invest on the JSE. The app syncs our portfolios and lets us see what each other is investing in, share our reasoning, and discuss stocks together. Think "EveryTicker meets a private group chat around investments."

The name is **Stokvel** (working title — a nod to the South African tradition of group savings clubs).

## Core features (v1)

### 1. EasyEquities portfolio sync
- Each user connects their EasyEquities account (username + password)
- Use the unofficial Python client: https://github.com/deanmalan/easy-equities-client
- Pull holdings (stock name, contract code, purchase value, current value, current price, profit/loss %)
- Support multiple account types (ZAR, TFSA, USD)
- Sync on login and allow manual refresh
- Store credentials securely (encrypted at rest)

### 2. Privacy controls per user
Each user chooses their visibility level:
- **Full transparency**: friends see stock names, amounts, and P&L
- **Percentages only**: friends see stock names and allocation %, but no Rand values
- **Holdings only**: friends see which stocks you hold, nothing else
- **Private**: portfolio hidden entirely, can still post theses and comment

### 3. Portfolio view
- Each user has a profile page showing their portfolio (filtered by their privacy setting)
- Simple card layout per holding: stock logo (from EasyEquities image URL), name, and whatever the privacy level allows
- Group view: a combined feed showing recent portfolio changes across the group ("Sarah just added Capitec to her TFSA")

### 4. Investment theses
- When viewing any stock in your portfolio, you can write a "thesis" — a short post explaining why you bought it
- Theses are visible to your group
- Others can comment on theses
- Theses are timestamped and tied to the stock

### 5. AI stock summaries
- Tap any JSE stock (in anyone's portfolio) to see an AI-generated summary
- Use Claude API (claude-sonnet-4-20250514) to generate a plain-language overview: what the company does, recent performance, key metrics
- Pull basic stock info from Yahoo Finance (.JO tickers) as context for the prompt
- Cache summaries for 24 hours to avoid excessive API calls

### 6. Activity feed
- Main screen is a chronological feed combining:
  - Portfolio changes ("Thabo added Naspers")
  - New theses posted
  - Comments on theses
- Simple, clean, scrollable

### 7. Group/invite system
- Users create or join a group via invite code
- A group is just a circle of friends who can see each other's activity
- Keep it simple: one group per user for v1

## Tech stack

### Backend
- **Python + FastAPI**
- **SQLite** database (simple, no infrastructure needed for v1)
- **SQLAlchemy** ORM
- Endpoints for: auth, portfolio sync, theses CRUD, comments CRUD, feed, AI summaries
- Background task to sync portfolios periodically

### Frontend
- **React** (Vite)
- **Tailwind CSS** for styling
- Mobile-first design (most users will access on phone)
- Clean, modern aesthetic — think dark theme, card-based UI
- Pages: Login → Feed → My Portfolio → Friend's Portfolio → Stock Detail (with AI summary + theses)

### Auth
- Simple email + password auth with JWT tokens
- No OAuth needed for v1

## Design direction

This is a South African app for young investors. The vibe should be:
- **Dark theme** as default (dark charcoal/near-black background, not pure black)
- **Accent color**: a warm gold/amber — nods to the JSE/finance without being corporate
- **Typography**: modern, slightly bold — something with personality, not generic
- **Cards with subtle depth** — slight borders or shadows, not flat
- **Minimal but not sterile** — it should feel like a place friends hang out, not a Bloomberg terminal
- Mobile-first: thumb-friendly, big tap targets, smooth scrolling feed

## File structure

```
stokvel/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT auth logic
│   ├── ee_sync.py           # EasyEquities sync logic
│   ├── ai_summary.py        # Claude API integration
│   ├── routes/
│   │   ├── auth.py
│   │   ├── portfolio.py
│   │   ├── theses.py
│   │   ├── comments.py
│   │   ├── feed.py
│   │   └── groups.py
│   ├── database.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Feed.jsx
│   │   │   ├── Portfolio.jsx
│   │   │   ├── StockDetail.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Login.jsx
│   │   │   └── GroupSetup.jsx
│   │   ├── components/
│   │   │   ├── HoldingCard.jsx
│   │   │   ├── ThesisCard.jsx
│   │   │   ├── CommentThread.jsx
│   │   │   ├── FeedItem.jsx
│   │   │   ├── AISummary.jsx
│   │   │   ├── PrivacySelector.jsx
│   │   │   └── NavBar.jsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.js
├── README.md
└── docker-compose.yml       # optional, for easy local dev
```

## Database models

### User
- id, email, password_hash, display_name, avatar_url
- ee_username (encrypted), ee_password (encrypted)
- privacy_level (enum: full, percentages, holdings, private)
- group_id (foreign key)
- created_at

### Group
- id, name, invite_code, created_by
- created_at

### Holding
- id, user_id, account_type (ZAR/TFSA/USD)
- stock_name, contract_code, isin
- purchase_value, current_value, current_price, shares
- logo_url
- last_synced_at

### Thesis
- id, user_id, contract_code, stock_name
- body (text)
- created_at, updated_at

### Comment
- id, thesis_id, user_id
- body (text)
- created_at

### FeedEvent
- id, user_id, event_type (added_stock, removed_stock, new_thesis, new_comment)
- metadata (JSON — stock name, thesis id, etc.)
- created_at

### StockSummaryCache
- contract_code, summary_text, generated_at

## Important notes

1. **EasyEquities credentials**: These are sensitive. Encrypt them using Fernet (from cryptography library) before storing in SQLite. The encryption key should be in an environment variable, never hardcoded.

2. **EasyEquities sync**: The unofficial client may need adaptation. If the pip package `easy-equities-client` doesn't work, fall back to the approach in the GitHub repo (session-based scraping). Build the sync as a standalone module (ee_sync.py) so it's easy to swap out if the client breaks.

3. **AI summaries**: Use Claude claude-sonnet-4-20250514 via the Anthropic API. The prompt should ask for a plain-language summary suitable for a retail investor — no jargon, 3-4 paragraphs max. Pass in the stock name and any Yahoo Finance data as context.

4. **Start simple**: Get the portfolio sync and display working first. Then add theses and comments. Then AI summaries. Then the feed. Build incrementally.

5. **No deployment yet**: Just get it running locally. I'll figure out hosting later.

## First task

Start by building the backend: database models, auth endpoints, and the EasyEquities sync module. Get to a point where I can register a user, store their EE credentials, sync their portfolio, and see their holdings via an API endpoint. Then move to the frontend.
