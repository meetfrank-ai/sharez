# Sharez — Market Data Waterfall Sprint

## Context
Portfolio P&L is broken for unit trusts and AMETFs. EODHD only covers JSE stocks and established ETFs. Need a waterfall pricing system that tries multiple sources and validates results.

---

## Task 1: Instrument Map Table + Seed Data

**Problem:** ticker_resolver.py uses in-memory fuzzy matching. No way to classify instrument types or map to multiple data sources.

**Build:**
- Create `instrument_map` table in Supabase
- Seed with known EE instruments (stocks, ETFs, AMETFs, unit trusts)
- Each entry: ee_name, ticker, market, instrument_type, eodhd_symbol, yfinance_symbol, scrape_source, scrape_code, sector
- Replace ticker_resolver.py lookups with DB queries

**Test:**
```bash
# After seeding, verify mappings
TOKEN=$(curl -s -X POST "https://sharez.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"thabo@sharez.co.za","password":"demo1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Check instrument map via a new endpoint
curl -s "https://sharez.onrender.com/api/stocks/resolve?name=Prosus%20N.V" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"ticker": "PRX", "market": "JSE", "type": "stock", "eodhd": "PRX.JSE"}

curl -s "https://sharez.onrender.com/api/stocks/resolve?name=36ONE%20BCI%20SA%20Equity%20Fund%20Class%20C" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"ticker": null, "market": null, "type": "unit_trust", "scrape_source": "morningstar"}
```

---

## Task 2: Waterfall Price Resolver

**Problem:** Single-source pricing. If EODHD fails, holdings show purchase price (0% P&L).

**Build:**
- `resolve_price(holding)` function that tries: EODHD → yfinance → scraped cache → null
- Each source returns: price, source, confidence, timestamp
- Stop at first valid result
- Store price_source on holdings table

**Test:**
```bash
# Import transactions, then check portfolio
curl -s "https://sharez.onrender.com/api/portfolio/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
for h in json.load(sys.stdin):
    cv = h.get('current_value',0) or 0
    pv = h.get('purchase_value',0) or 0
    print(f'{h[\"stock_name\"]:50s} cv=R{cv:>10,.0f} pv=R{pv:>10,.0f} same={abs(cv-pv)<1}')
"
# Expected: Prosus has different cv/pv. Unit trusts show "SAME" until scraper built.
# NO stock should show wildly wrong P&L (like -61%)
```

---

## Task 3: Sanity Check

**Problem:** Wrong ticker matches cause -61% P&L on Coronation when real P&L is ~0%.

**Build:**
- `sanity_check(current_price, avg_buy_price, instrument_type)` function
- Thresholds: unit_trust <50%, ametf <50%, etf <60%, stock <80%
- If fails: log anomaly, skip this source, try next
- Add `price_anomalies` table for monitoring

**Test:**
```bash
# After waterfall + sanity check deployed:
curl -s "https://sharez.onrender.com/api/portfolio/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
for h in json.load(sys.stdin):
    cv = h.get('current_value',0) or 0
    pv = h.get('purchase_value',0) or 0
    pnl = ((cv-pv)/pv*100) if pv > 0 else 0
    flag = 'SUSPECT' if abs(pnl) > 50 else 'OK'
    print(f'{h[\"stock_name\"]:50s} pnl={pnl:>+7.1f}% [{flag}]')
"
# Expected: No holdings show "SUSPECT". Coronation should NOT show -61%.
```

---

## Task 4: NAV Scraper (Daily Cron)

**Problem:** Unit trusts and AMETFs have no API coverage. Need to scrape NAV from fund manager websites.

**Build:**
- `scraped_prices` table: instrument_code, nav_price, nav_date, source, scraped_at
- Scraper functions for: Moneyweb, Allan Gray, EasyETFs, Coronation
- Daily cron job (or manual trigger endpoint)
- Integrate scraped prices into waterfall resolver (Source 3)

**Test:**
```bash
# Trigger scraper manually
curl -s -X POST "https://sharez.onrender.com/api/stocks/scrape-navs" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"scraped": 5, "failed": 0, "instruments": ["36ONE...", "Merchant West..."]}

# Verify scraped prices
curl -s "https://sharez.onrender.com/api/stocks/scraped-prices" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
for p in json.load(sys.stdin):
    print(f'{p[\"instrument_name\"]:50s} R{p[\"nav_price\"]:>8.2f} ({p[\"source\"]}, {p[\"nav_date\"]})')
"

# Then check portfolio — unit trusts should now have real prices
curl -s "https://sharez.onrender.com/api/portfolio/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
for h in json.load(sys.stdin):
    cv = h.get('current_value',0) or 0
    pv = h.get('purchase_value',0) or 0
    same = 'SAME' if abs(cv-pv)<1 else 'LIVE'
    print(f'{h[\"stock_name\"]:50s} [{same}]')
"
# Expected: 36ONE, Merchant West, Allan Gray show "LIVE" (not "SAME")
```

---

## Task 5: Price Confidence Badges (UI)

**Problem:** User can't tell if a price is live, daily NAV, or stale.

**Build:**
- Add `price_source` and `price_confidence` to HoldingOut schema
- Frontend: colored dot next to each holding
  - Green "Live" = EODHD/yfinance
  - Blue "Daily NAV" = scraped
  - Gray "No data" = no source found
- Show "Price unavailable" instead of 0% P&L when no data

**Test:**
```
Manual UI check:
1. Go to Portfolio page
2. Prosus should show green dot "Live"
3. 36ONE should show blue dot "Daily NAV" (after scraper runs)
4. Any unmatched fund shows gray "No data"
5. No holding shows -61% or wildly wrong P&L
```

---

## Implementation Order

```
Task 1: Instrument map (30 min)
  ↓
Task 2: Waterfall resolver (45 min)
  ↓
Task 3: Sanity check (20 min)
  ↓
Task 4: NAV scraper (60 min)
  ↓
Task 5: UI badges (30 min)
```

Total: ~3 hours

---

## Current Status (2026-03-24)

| Task | Status | Notes |
|---|---|---|
| 1. Instrument map | ✅ Done | 30+ instruments seeded |
| 2. Waterfall resolver | ✅ Done | EODHD → yfinance → scrape → null |
| 3. Sanity check | ✅ Done | Blocks wrong P&L values |
| 4. NAV scraper | ❌ Blocked | See below |
| 5. UI badges | ✅ Done | "Price unavailable" for unpriced holdings |

### Task 4 Blockers — Unit Trust & AMETF Pricing

**Problem:** No free API covers SA unit trusts or new AMETFs (2024-2026).

**What we tested:**
- Moneyweb unit trust page → JS-rendered, simple HTTP scrape returns no data
- Morningstar SA → JS-rendered, empty response
- Profile Data API → 404 (doesn't exist at tested URL)
- yfinance for AMETFs (AGOGE.JO, EASYGE.JO, CGEM.JO) → 429 rate-limited from local IP. May work on Render's IP.
- EODHD → only 4 JSE symbols returned on current plan (not enough for full coverage)

**Instruments affected (from real user portfolio):**
- 36ONE BCI SA Equity Fund Class C → unit trust, NO data source
- Merchant West SCI Value Fund → unit trust, NO data source
- Allan Gray Orbis Global Equity Feeder AMETF → AMETF, yfinance may work (rate-limited when tested)
- Coronation Global Emerging Markets Prescient Feeder AMETF → AMETF, yfinance may work
- EasyETFs Global Equity Actively Managed ETF → AMETF, yfinance may work

**Options to explore (tomorrow):**
1. **Playwright/headless browser** for Moneyweb scraping — works but heavy dependency
2. **FundsData.co.za API** — SA-specific fund pricing, need to check pricing/availability
3. **ProfileData API** — find correct endpoint (the URL we tried was wrong)
4. **EasyEquities internal prices** — when user uploads XLSX, the prices in EE at time of download could be captured
5. **Upgrade EODHD plan** — higher tier may include more JSE symbols including AMETFs
6. **yfinance on Render** — test from deployed server where IP isn't rate-limited
7. **Ask Claude to web-search for current NAV** — use Claude API with web search to find latest fund prices from public sources

---

## Files to Create/Modify

**New files:**
- `backend/instrument_map.py` — DB operations for instrument_map table
- `backend/price_resolver.py` — waterfall price resolution
- `backend/nav_scraper.py` — daily NAV scraping for unit trusts
- `backend/routes/stocks.py` — add resolve + scrape endpoints (extend existing)

**Modify:**
- `backend/models.py` — InstrumentMap + ScrapedPrice + PriceAnomaly models
- `backend/ee_import.py` — use instrument_map for ticker resolution + waterfall for prices
- `backend/main.py` — seed instrument_map data
- `backend/schemas.py` — add price_source/confidence to HoldingOut
- `frontend/src/components/HoldingCard.jsx` — price confidence badges
- `frontend/src/pages/Portfolio.jsx` — handle "no data" gracefully
