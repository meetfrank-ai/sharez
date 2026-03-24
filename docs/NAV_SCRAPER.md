# Sharez — ProfileData NAV Scraper

## Status: TEMPORARY SOLUTION

This scraper is an **interim workaround** for getting latest current values on unlisted SA unit trusts and AMETFs. The long-term plan is to replace it with a professional/licensed data feed once feedback is received on that route.

**This part of the architecture is expected to change.**

---

## What it does

Scrapes the ProfileData ASISA Latest Prices page:
`https://funds.profiledata.co.za/aci/ASISA/LatestPrices.aspx`

This page contains ~5,500 SA fund prices updated daily, including:
- Unit trusts (36ONE, Merchant West, Allan Gray, Coronation, etc.)
- AMETFs (Allan Gray AGOGE, Coronation CGEM, etc.)
- All ASISA-registered funds

## Data extracted per fund

| Field | Example |
|---|---|
| Fund name | "36ONE BCI SA Equity Fund Class C" |
| Target market | "Retail" or "Institutional" |
| NAV price | R330.99 |
| Price date | 23/03/26 |

## How it works

1. HTTP GET to ProfileData (server-rendered HTML, no JS needed)
2. Parse ~5,500 table rows with regex
3. Extract: fund_name, target_market, nav, price_date
4. Store in `scraped_prices` table (upsert by instrument_code + source)
5. Old prices preserved if scrape fails (no data wipe)

## Matching to holdings

When the waterfall price resolver needs a scraped price, it matches by:
1. **Exact code match** — cleaned fund name as key
2. **Exact name match** — raw fund name from ProfileData
3. **Conservative contains** — holding name must be fully contained in scraped name
4. **No match** — returns None rather than risk wrong fund class

**Intentionally conservative.** Wrong NAV from wrong class destroys trust.

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/stocks/scrape-navs` | Trigger a scrape (manual or cron) |
| GET | `/api/stocks/scraped-prices` | List all scraped prices |

## Files

- `backend/nav_scraper.py` — scraper logic, storage, matching
- `backend/price_resolver.py` — waterfall resolver uses scraped prices as Source 3
- `backend/models.py` — ScrapedPrice model
- `backend/routes/stocks.py` — API endpoints

## Schedule

Run daily after market close (~17:30 SAST). Currently triggered manually via API.
Future: add to a cron job or Render background worker.

## What will replace this

A professional data feed setup (to be determined). Options being evaluated:
- Licensed ProfileData API (if available)
- FundsData.co.za
- Direct fund manager data feeds
- ASISA data distribution agreement

When replaced, the `nav_scraper.py` file and related code should be removed. The `scraped_prices` table and `price_resolver.py` Source 3 logic can be adapted for the new feed.
