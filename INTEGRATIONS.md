# Sharez — External Integrations & Data Sources

Every place in the app where data comes from outside the Sharez database. Use this to verify each integration is working.

---

## 1. EODHD API (Market Data)

**What it provides:** Stock prices, sparkline charts, fundamentals, news, ticker search
**API Key env var:** `EODHD_API_KEY`
**Plan:** $29/mo (All-World Extended)
**Base URL:** `https://eodhd.com/api/`

### 1a. End-of-Day Prices
- **Used in:** `backend/ai_summary.py` → `_fetch_eodhd()`
- **Endpoint:** `GET /eod/{TICKER}.JSE?from=X&to=Y&order=d`
- **Returns:** Array of `{date, open, high, low, close, volume}`
- **JSE prices are in cents** — divided by 100 for rands
- **Used for:** Stock header price, daily change calculation, sparkline chart (1 year)
- **Cache:** 4 hours (via StockSummaryCache table)
- **Test:** `curl "https://eodhd.com/api/eod/CPI.JSE?api_token=KEY&fmt=json&from=2026-03-20&to=2026-03-24"`

### 1b. Holdings Price Refresh
- **Used in:** `backend/ee_import.py` → `_refresh_holdings_prices()`
- **Same endpoint as 1a** but fetches last 7 days for each holding
- **Updates:** `current_value = shares × latest_close / 100`
- **Triggered:** After transaction import + on portfolio view if prices > 1 hour old
- **Test:** Import transactions → check portfolio values update

### 1c. JSE Symbol List (Ticker Resolution)
- **Used in:** `backend/ticker_resolver.py` → `_fetch_jse_symbols()`
- **Endpoint:** `GET /exchange-symbol-list/JSE`
- **Returns:** Array of 466 JSE symbols with `{Code, Name, Exchange, Currency, Type}`
- **Cache:** 24 hours in-memory
- **Purpose:** Maps stock names from EE transactions (e.g. "Prosus N.V") to EODHD tickers (e.g. "PRX.JSE")
- **Matching order:** Exact name → contains → first word → hardcoded fallback
- **Test:** `curl "https://eodhd.com/api/exchange-symbol-list/JSE?api_token=KEY&fmt=json" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))"`

### 1d. Fundamentals (Limited)
- **Used in:** `backend/ai_summary.py` → `_fetch_eodhd()` (tried but returns 403)
- **Endpoint:** `GET /fundamentals/{TICKER}.JSE`
- **Status:** ⚠️ Returns "Forbidden" on current plan for JSE stocks
- **Workaround:** Sector hardcoded in `SECTOR_MAP`, metrics come from Claude's knowledge
- **To fix:** Upgrade EODHD plan or use yfinance fallback for fundamentals

### 1e. News
- **Used in:** `backend/ai_summary.py` → `_fetch_eodhd()`
- **Endpoint:** `GET /news?s={TICKER}&limit=5`
- **Returns:** Array of `{title, source, date}`
- **Fed to Claude** for the news digest section of AI summary
- **Test:** `curl "https://eodhd.com/api/news?api_token=KEY&s=CPI.JSE&limit=3&fmt=json"`

---

## 2. Claude API (AI Summaries)

**What it provides:** Stock analysis, sentiment, risk notes, news rewriting
**API Key env var:** `ANTHROPIC_API_KEY`
**Model:** `claude-sonnet-4-20250514`
**Base URL:** Via `anthropic` Python SDK

### 2a. Stock AI Summary
- **Used in:** `backend/ai_summary.py` → `_generate_structured_summary()`
- **Input:** Stock name, price data (from EODHD), historical performance, community data
- **Output:** Structured JSON with:
  - `quick_take` — 2-3 sentence summary with historical performance
  - `sentiment_tags` — bullish/caution/neutral pills
  - `key_metrics` — 3 most relevant metrics (AI-selected)
  - `news_digest` — rewritten headlines
  - `risk_note` — financial risks only (not community size)
- **Cache:** 4 hours in `stock_summary_cache` table
- **Auto-clear:** Stale cache with "community" in risk note or missing price data
- **API endpoint:** `GET /api/feed/stock-summary?contract_code=X&stock_name=Y`
- **Test:** Visit any stock page → AI Summary tab

### 2b. Trade Screenshot Extraction (v2 — disabled)
- **Used in:** `backend/routes/trades.py` → `extract_trade_from_screenshot()`
- **Status:** Backend exists but frontend Trade button removed
- **Would use:** Claude Vision to extract trade details from EE screenshots
- **Test:** Not testable from UI currently

---

## 3. EasyEquities (Portfolio Data)

**No API — data comes from user-uploaded files**

### 3a. Transaction History XLSX Import
- **Used in:** `backend/ee_import.py` → `parse_transaction_xlsx()`
- **Source:** User downloads from EE: Hamburger menu → Transactions → Account → "Download Past Year's Transactions"
- **File format:** Excel with columns: Date, Comment, Debit/Credit
- **Parses:** "Bought {stock} {qty} @ {price}" and "Sold {stock} {qty} @ {price}"
- **Dedup:** MD5 hash of date+stock+action+qty+price prevents duplicate imports
- **Flow:** Upload → parse → store in `user_transactions` → rebuild `holdings`
- **API endpoints:**
  - `POST /api/portfolio/import-preview` — preview what would be imported
  - `POST /api/portfolio/import-transactions` — import and save
- **Test:** Upload your Transaction History XLSX → check transactions page + portfolio

### 3b. EE Account Linking (NOT WORKING)
- **Used in:** `backend/ee_sync.py`
- **Status:** ❌ EasyEquities added OAuth PKCE + CAPTCHA, blocking programmatic login
- **The `easy-equities-client` package is broken** for the current EE auth flow
- **Workaround:** XLSX import (3a above)
- **UI:** EE connection form still exists in Settings but will fail

---

## 4. Supabase (Database)

**What it provides:** PostgreSQL database
**Connection:** Via `DATABASE_URL` env var (pooler endpoint)
**Connection string format:** `postgresql://postgres.{id}:{password}@aws-1-eu-west-1.pooler.supabase.com:6543/postgres`

### 4a. Database Tables
- All 15+ tables created via SQLAlchemy `create_all()` on startup
- New columns added via ALTER TABLE migrations in `main.py`
- **Test:** Login should work → if it fails, likely a migration issue

### 4b. Connection Pooler
- Uses Supabase's connection pooler (port 6543), not direct connection (port 5432)
- Direct connection blocked from Render's network
- `pool_pre_ping=True` for connection health checks

---

## 5. Render (Hosting)

**What it provides:** Web service hosting, auto-deploy from GitHub
**API Key:** `rnd_mrloKsj1hBuHub1xevR3uc2BTHE6`
**Service ID:** `srv-d70lfg75gffc73dvnh2g`

### 5a. Auto-Deploy
- Pushes to `main` branch trigger automatic builds
- Build: `bash build.sh` (pip install + npm install + vite build + copy to static)
- Start: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### 5b. Environment Variables (managed via API)
| Key | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection |
| `SHAREZ_SECRET_KEY` | JWT token signing |
| `SHAREZ_FERNET_KEY` | EE credential encryption |
| `ANTHROPIC_API_KEY` | Claude API for AI summaries |
| `EODHD_API_KEY` | Market data |
| `PYTHON_VERSION` | 3.11.11 |
| `NODE_VERSION` | 20 |

### 5c. Render API
- Set env vars: `PUT /v1/services/{id}/env-vars/{KEY}`
- Trigger deploy: `POST /v1/services/{id}/deploys`
- Check status: `GET /v1/services/{id}/deploys?limit=1`

---

## 6. yfinance (Fallback Market Data)

**What it provides:** Stock prices, basic fundamentals
**Status:** Fallback only — used when `EODHD_API_KEY` is not set
**Used in:** `backend/ai_summary.py` → `_fetch_yfinance()`
**Issues:** Rate-limited (429 errors), unreliable for JSE, deprecated pandas warnings
**Ticker format:** `CPI.JO` (different from EODHD's `CPI.JSE`)

---

## Verification Checklist

Run these checks to verify all integrations:

### Quick API test
```bash
# 1. Login
TOKEN=$(curl -s -X POST "https://sharez.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"thabo@sharez.co.za","password":"demo1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Feed loads (Supabase working)
curl -s "https://sharez.onrender.com/api/feed/?filter=all&scope=blend" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(f'{len(json.load(sys.stdin))} feed items')"

# 3. Stock summary (EODHD + Claude working)
curl -s "https://sharez.onrender.com/api/feed/stock-summary?contract_code=CPI&stock_name=Capitec%20Bank" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Price: {d.get(\"market_data\",{}).get(\"price\",\"MISSING\")}')
print(f'AI: {d.get(\"quick_take\",\"MISSING\")[:50]}...')
print(f'Sparkline: {len(d.get(\"sparkline\",[]))} points')
"

# 4. Portfolio with live prices (EODHD price refresh)
curl -s "https://sharez.onrender.com/api/portfolio/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
for h in d[:3]: print(f'{h[\"stock_name\"]}: purchase=R{h.get(\"purchase_value\",0):,.0f} current=R{h.get(\"current_value\",0):,.0f}')
"

# 5. EODHD direct test
curl -s "https://eodhd.com/api/eod/CPI.JSE?api_token=69c232e4540764.25470792&fmt=json&from=2026-03-20&to=2026-03-24" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'EODHD: {len(d)} data points, latest close={d[0][\"close\"]} cents')"
```

### Manual UI checks
1. **Login** → should work (Supabase)
2. **Feed** → should show notes + transactions (Supabase)
3. **Any stock → AI Summary tab** → should show quick take, metrics, sparkline (EODHD + Claude)
4. **Import transactions** → upload XLSX → portfolio should build (file parsing)
5. **Portfolio page** → values should reflect market prices, not just purchase prices (EODHD refresh)
6. **Discover** → should show users (Supabase)
7. **Restack a note** → should create new note with embedded original (Supabase)

### Known limitations
- EODHD fundamentals (P/E, market cap) returns 403 for JSE on current plan
- Sectors are hardcoded for known stocks, "Equities" for unknown
- Unit trusts/ETFs (36ONE, Allan Gray, Coronation) may not have EODHD price data
- EE direct account linking is broken (OAuth + CAPTCHA)
- yfinance fallback is unreliable and rate-limited
