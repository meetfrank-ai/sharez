# Sharez — Market data strategy spec (v2)

## The core insight

EasyEquities uses internal fractional pricing for AMETFs and unit trusts. Their "buy price" is in EE-internal units, not JSE or fund manager units. Any external data source (EODHD, yfinance, FundsData) returns prices on a different scale. Comparing EE's buy price against an external current price gives wildly wrong P&L numbers (-61.6% when the real answer is -7%).

**The fix: use external sources for BOTH historical and current prices.** Same scale in, same scale out. P&L is correct by construction.

```
Old (broken):
  buy_price  = EE says R10.92 (EE-internal units)
  curr_price = EODHD says R4.19 (JSE units)
  P&L = (4.19 - 10.92) / 10.92 = -61.6%  ← WRONG

New (fixed):
  buy_date   = 10 Mar 2026 (from EE XLSX)
  buy_price  = EODHD historical for 10 Mar = R4.52 (JSE units)
  curr_price = EODHD current = R4.19 (JSE units)
  P&L = (4.19 - 4.52) / 4.52 = -7.3%  ← CORRECT
```

---

## What we use from EE vs external sources

| Data point | Source | Why |
|-----------|--------|-----|
| Trade dates | EE XLSX | Correct — a date is a date |
| Rand amounts per trade | EE XLSX | Correct — R249,990 spent is R249,990 regardless of unit scale |
| Number of trades | EE XLSX | Correct — count is count |
| Portfolio weights (% allocation) | EE XLSX (cost basis proportions) | Correct — R249,990 / R1,670,000 total = 14.9% |
| Buy price per unit | **EXTERNAL historical** | EE's unit price is in EE-internal scale — ignore it for P&L |
| Current price per unit | **EXTERNAL current** | Same external source as buy price — same scale |
| P&L % | Calculated from external prices | Both sides on same scale → correct P&L |

**EE's buy price is still stored** for reference and unit mismatch detection, but it is NEVER used in P&L calculations.

---

## Instrument types and their data sources

| Type | Historical price | Current price | Example |
|------|-----------------|---------------|---------|
| JSE stock | EODHD historical EOD | EODHD real-time | Prosus (PRX.JSE) |
| US stock | EODHD historical EOD | EODHD real-time | Apple (AAPL.US) |
| Established ETF | EODHD historical EOD | EODHD real-time | Satrix Top 40 (STX40.JSE) |
| AMETF | EODHD historical EOD | EODHD real-time | Allan Gray AGOGE (AGOGE.JSE) |
| Unit trust | FundsData historical NAV | FundsData current NAV | 36ONE BCI SA Equity |

Every instrument type now has a calculated P&L. No more "manual only" for anything.

---

## Source 1: EODHD (stocks, ETFs, AMETFs)

### Historical price for buy date

```javascript
async function getHistoricalPrice(ticker, exchange, date) {
  // date format: YYYY-MM-DD
  const symbol = `${ticker}.${exchange}`;
  const url = `https://eodhd.com/api/eod/${symbol}?from=${date}&to=${date}&api_token=${EODHD_KEY}&fmt=json`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.length) {
    // Market was closed on that date — try nearby dates
    return getHistoricalPriceNearest(ticker, exchange, date);
  }

  const priceRaw = parseFloat(data[0].close);
  // EODHD returns JSE prices in cents (ZAC) — convert to rands
  const price = exchange === 'JSE' ? priceRaw / 100 : priceRaw;

  return {
    source: 'eodhd',
    date: data[0].date,
    price: price,
    currency: exchange === 'JSE' ? 'ZAR' : 'USD',
  };
}

// If buy date falls on weekend/holiday, find nearest trading day
async function getHistoricalPriceNearest(ticker, exchange, date) {
  const d = new Date(date);
  // Look back up to 5 days
  const from = new Date(d);
  from.setDate(from.getDate() - 5);
  const fromStr = from.toISOString().split('T')[0];

  const symbol = `${ticker}.${exchange}`;
  const url = `https://eodhd.com/api/eod/${symbol}?from=${fromStr}&to=${date}&api_token=${EODHD_KEY}&fmt=json`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.length) return null;

  // Take the last (most recent) entry
  const last = data[data.length - 1];
  const price = exchange === 'JSE' ? parseFloat(last.close) / 100 : parseFloat(last.close);

  return {
    source: 'eodhd',
    date: last.date,
    price: price,
    currency: exchange === 'JSE' ? 'ZAR' : 'USD',
  };
}
```

### Current price

```javascript
async function getCurrentPrice(ticker, exchange) {
  const symbol = `${ticker}.${exchange}`;
  const url = `https://eodhd.com/api/real-time/${symbol}?api_token=${EODHD_KEY}&fmt=json`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const priceRaw = parseFloat(data.close);
  const price = exchange === 'JSE' ? priceRaw / 100 : priceRaw;

  return {
    source: 'eodhd',
    price: price,
    currency: exchange === 'JSE' ? 'ZAR' : 'USD',
    timestamp: data.timestamp,
  };
}
```

### Cost
- All-World: $39.99/month (100K API calls/day — good for v1)
- Historical EOD endpoint has no extra cost at this tier

---

## Source 2: FundsData (unit trusts)

FundsData provides historical and current NAV prices for SA unit trusts. This is the only reliable source for unlisted funds like 36ONE BCI and Merchant West.

### Historical NAV for buy date

```javascript
async function getFundsDataHistorical(fundCode, date) {
  // FundsData API — check their docs for exact endpoint
  // They provide daily NAV history for SA unit trusts
  const url = `https://api.fundsdata.co.za/v1/funds/${fundCode}/nav?date=${date}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${FUNDSDATA_KEY}` }
  });
  if (!response.ok) return null;

  const data = await response.json();

  return {
    source: 'fundsdata',
    date: data.date,
    price: parseFloat(data.nav),  // NAV per unit in ZAR
    currency: 'ZAR',
  };
}

// Nearest date fallback (same logic as EODHD)
async function getFundsDataHistoricalNearest(fundCode, date) {
  const d = new Date(date);
  const from = new Date(d);
  from.setDate(from.getDate() - 5);
  const fromStr = from.toISOString().split('T')[0];

  const url = `https://api.fundsdata.co.za/v1/funds/${fundCode}/nav?from=${fromStr}&to=${date}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${FUNDSDATA_KEY}` }
  });
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.length) return null;

  const last = data[data.length - 1];
  return {
    source: 'fundsdata',
    date: last.date,
    price: parseFloat(last.nav),
    currency: 'ZAR',
  };
}
```

### Current NAV

```javascript
async function getFundsDataCurrent(fundCode) {
  const url = `https://api.fundsdata.co.za/v1/funds/${fundCode}/nav/latest`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${FUNDSDATA_KEY}` }
  });
  if (!response.ok) return null;

  const data = await response.json();

  return {
    source: 'fundsdata',
    price: parseFloat(data.nav),
    currency: 'ZAR',
    date: data.date,  // NAVs are typically end-of-previous-day
  };
}
```

### Note on FundsData
- Confirm exact API endpoints and authentication when you get access
- NAV prices for unit trusts are typically published T+1 (one day delay)
- Prices are always in ZAR (rands), not cents
- FundsData may use different fund codes than EE — add `fundsdata_code` column to instrument_map

---

## Source 3: yfinance (free fallback)

If EODHD fails for a stock/ETF/AMETF, try yfinance. Same approach — historical + current from the same source.

```javascript
async function getYFinanceHistorical(ticker, exchange, date) {
  const symbol = exchange === 'JO' ? `${ticker}.JO` : ticker;
  // yfinance returns daily OHLCV — fetch a small range around the date
  const d = new Date(date);
  const from = new Date(d);
  from.setDate(from.getDate() - 5);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(from.getTime()/1000)}&period2=${Math.floor(d.getTime()/1000) + 86400}&interval=1d`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    // Find the closest date
    const targetTs = d.getTime() / 1000;
    let closest = 0;
    let minDiff = Infinity;
    for (let i = 0; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - targetTs);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    }

    const price = closes[closest];
    // Check if yfinance returns cents or rands for this ticker
    const currency = result.meta.currency;
    const priceZAR = (currency === 'ZAc' || currency === 'ZAC') ? price / 100 : price;

    return {
      source: 'yfinance',
      date: new Date(timestamps[closest] * 1000).toISOString().split('T')[0],
      price: priceZAR,
      currency: 'ZAR',
    };
  } catch (err) {
    return null;
  }
}
```

---

## P&L calculation: the new approach

### For a single trade

```javascript
function calculateTradePnL(externalBuyPrice, currentPrice) {
  if (!externalBuyPrice || !currentPrice) return null;
  return (currentPrice - externalBuyPrice) / externalBuyPrice;
}
```

### For multiple trades (weighted average)

```javascript
function calculateHoldingPnL(trades, currentPrice) {
  // trades = [{ date, randAmount, externalBuyPrice }, ...]
  //
  // The weights come from EE rand amounts — these are correct
  // regardless of EE's unit scale.
  // The prices come from external sources — same scale as currentPrice.

  const totalRandInvested = trades.reduce((sum, t) => sum + t.randAmount, 0);

  // Weighted average external buy price
  const weightedAvgBuyPrice = trades.reduce((sum, t) => {
    const weight = t.randAmount / totalRandInvested;
    return sum + (t.externalBuyPrice * weight);
  }, 0);

  // P&L
  const pnl = (currentPrice - weightedAvgBuyPrice) / weightedAvgBuyPrice;

  return {
    avgBuyPrice: weightedAvgBuyPrice,   // external scale
    currentPrice: currentPrice,          // external scale
    pnlPercent: pnl,
    totalRandInvested: totalRandInvested,  // from EE — for weight calculation
  };
}
```

### Portfolio weights

Weights use EE's rand amounts (which are correct):

```javascript
function calculatePortfolioWeights(holdings) {
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.totalRandInvested, 0);

  return holdings.map(h => ({
    ...h,
    weight: h.totalRandInvested / totalCostBasis,
  }));
}
```

---

## The complete resolver: from EE XLSX to portfolio

```javascript
async function resolveHolding(holding) {
  // holding = { eeName, trades: [{ date, randAmount, eeUnitPrice }], instrumentType }

  // 1. Look up instrument
  const instrument = await matchStockName(holding.eeName);
  if (!instrument) {
    return { ...holding, status: 'unknown', pnl: null };
  }

  // 2. Get current price from appropriate source
  let currentPrice = null;

  if (instrument.instrument_type === 'unit_trust') {
    // Unit trusts → FundsData
    currentPrice = await getFundsDataCurrent(instrument.fundsdata_code);
  } else {
    // Stocks, ETFs, AMETFs → EODHD, fallback yfinance
    currentPrice = await getCurrentPrice(instrument.ticker, 'JSE');
    if (!currentPrice) {
      currentPrice = await getYFinanceCurrent(instrument.ticker, 'JO');
    }
  }

  if (!currentPrice) {
    return { ...holding, status: 'no_current_price', pnl: null };
  }

  // 3. Get historical prices for each trade date
  const tradesWithPrices = [];
  for (const trade of holding.trades) {
    let histPrice = null;

    if (instrument.instrument_type === 'unit_trust') {
      histPrice = await getFundsDataHistorical(instrument.fundsdata_code, trade.date);
      if (!histPrice) {
        histPrice = await getFundsDataHistoricalNearest(instrument.fundsdata_code, trade.date);
      }
    } else {
      histPrice = await getHistoricalPrice(instrument.ticker, 'JSE', trade.date);
      if (!histPrice) {
        histPrice = await getYFinanceHistorical(instrument.ticker, 'JO', trade.date);
      }
    }

    if (histPrice) {
      tradesWithPrices.push({
        date: trade.date,
        randAmount: trade.randAmount,
        externalBuyPrice: histPrice.price,
        priceSource: histPrice.source,
        priceDate: histPrice.date,
      });
    } else {
      // Could not find historical price for this trade date
      // Still include it with null price — weight calculation uses randAmount
      tradesWithPrices.push({
        date: trade.date,
        randAmount: trade.randAmount,
        externalBuyPrice: null,
        priceSource: null,
        priceDate: null,
      });
    }
  }

  // 4. Calculate P&L using only trades where we have external prices
  const pricedTrades = tradesWithPrices.filter(t => t.externalBuyPrice !== null);

  if (pricedTrades.length === 0) {
    return {
      ...holding,
      instrument,
      currentPrice: currentPrice.price,
      status: 'no_historical_prices',
      pnl: null,
      trades: tradesWithPrices,
    };
  }

  const result = calculateHoldingPnL(pricedTrades, currentPrice.price);

  // 5. Sanity check — even with same-scale prices, verify the result is reasonable
  if (Math.abs(result.pnlPercent) > 0.80) {
    // 80% gain or loss on a holding is unusual — flag for review
    console.warn(`Unusual P&L for ${holding.eeName}: ${(result.pnlPercent * 100).toFixed(1)}%`);
  }

  return {
    ...holding,
    instrument,
    currentPrice: currentPrice.price,
    currentPriceSource: currentPrice.source,
    avgBuyPrice: result.avgBuyPrice,
    pnlPercent: result.pnlPercent,
    totalRandInvested: result.totalRandInvested,
    status: 'resolved',
    tradesResolved: pricedTrades.length,
    tradesTotal: holding.trades.length,
    trades: tradesWithPrices,
  };
}
```

---

## Instrument map (updated)

Add `fundsdata_code` column for unit trusts:

```sql
ALTER TABLE instrument_map ADD COLUMN fundsdata_code TEXT;
```

Updated seed data:

```sql
-- JSE stocks (unchanged — EODHD works fine)
('Prosus N.V', 'PRX', 'JSE', 'stock', 'PRX.JO', 'PRX.JSE', NULL, NULL, NULL, 'Technology'),
('Capitec Bank', 'CPI', 'JSE', 'stock', 'CPI.JO', 'CPI.JSE', NULL, NULL, NULL, 'Financials'),

-- Established ETFs (unchanged — EODHD works fine)
('Satrix Top 40 ETF', 'STX40', 'JSE', 'etf', 'STX40.JO', 'STX40.JSE', NULL, NULL, NULL, 'Broad Market'),

-- AMETFs (now use EODHD historical + current — NOT EE buy prices)
('Allan Gray AGOGE', 'AGOGE', 'JSE', 'ametf', 'AGOGE.JO', 'AGOGE.JSE', NULL, NULL, NULL, 'Global Equity'),
('Coronation CGEM', 'CGEM', 'JSE', 'ametf', 'CGEM.JO', 'CGEM.JSE', NULL, NULL, NULL, 'Emerging Markets'),
('EasyETFs Global Equity', 'EASYGE', 'JSE', 'ametf', 'EASYGE.JO', 'EASYGE.JSE', NULL, NULL, NULL, 'Global Equity'),

-- Unit trusts (now use FundsData historical + current)
('36ONE BCI SA Equity Fund', NULL, NULL, 'unit_trust', NULL, NULL, NULL, NULL, 'FUND_CODE_36ONE', 'SA Equity'),
('Merchant West SCI Value', NULL, NULL, 'unit_trust', NULL, NULL, NULL, NULL, 'FUND_CODE_MW', 'SA Value'),
```

Replace `FUND_CODE_36ONE` and `FUND_CODE_MW` with actual FundsData fund codes once you have API access.

---

## P&L display and transparency

### In the UI

Show a small info icon next to P&L with a tooltip explaining the calculation:

```
+2.1% ℹ️
└── "Based on JSE closing prices. May differ slightly from your broker's P&L."
```

For unit trusts:

```
+3.3% ℹ️
└── "Based on daily NAV from fund manager. Updated end-of-day."
```

### When historical price is missing

If we can't find a historical price for a specific trade date (instrument wasn't listed yet, or data gap):

```
~+2.1% ℹ️
└── "Approximate — historical price not available for 2 of 5 trades."
```

The tilde (~) indicates approximation. Weight those trades using the nearest available date.

---

## Price refresh schedule

| Type | Source | Historical | Current refresh | Cache TTL |
|------|--------|-----------|----------------|-----------|
| JSE stock | EODHD | On import (cached forever) | 15 min during market hours | 15 min |
| US stock | EODHD | On import (cached forever) | 15 min during US hours | 15 min |
| ETF | EODHD | On import (cached forever) | 15 min during market hours | 15 min |
| AMETF | EODHD | On import (cached forever) | 15 min during market hours | 15 min |
| Unit trust | FundsData | On import (cached forever) | Once daily at 17:30 SAST | 24 hours |

Historical prices are fetched once at import time and cached permanently — they don't change. Current prices are refreshed on schedule.

---

## Caching

```javascript
// Historical prices — cached forever (they don't change)
async function cacheHistoricalPrice(ticker, date, source, price) {
  const key = `hist:${ticker}:${date}`;
  await redis.set(key, JSON.stringify({ price, source, fetchedAt: Date.now() }));
  // No TTL — historical prices are permanent
}

async function getCachedHistoricalPrice(ticker, date) {
  const key = `hist:${ticker}:${date}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

// Current prices — cached with TTL
async function cacheCurrentPrice(ticker, source, price, ttlSeconds) {
  const key = `curr:${ticker}`;
  await redis.set(key, JSON.stringify({ price, source, fetchedAt: Date.now() }), 'EX', ttlSeconds);
}
```

---

## ZAC vs ZAR reminder

- **EODHD** returns JSE prices in **ZAC (cents)**. Always divide by 100.
- **yfinance** is inconsistent. Check `meta.currency` field.
- **FundsData** returns NAVs in **ZAR (rands)**. No conversion needed.
- **EE XLSX** buy prices are in **ZAC (cents)** — but we're not using these for P&L anymore.
- **Database stores everything in ZAR.** Convert at ingestion.

---

## Edge cases

### 1. AMETF not yet listed on EODHD
Some very new AMETFs (listed late 2025 / early 2026) may not be in EODHD yet.
- Fallback: yfinance
- Fallback 2: FundsData (if the underlying fund is available there)
- Fallback 3: flag as `no_data` and show "Price data coming soon"

### 2. Trade date before instrument listing
If someone bought on EE before the JSE listing date (EE sometimes offers pre-listing access):
- No historical price exists for that date
- Use the first available trading day price as approximation
- Flag as approximate in UI

### 3. Multiple brokers
When Sharez supports IBKR and other brokers, those brokers use standard JSE units.
- For non-EE brokers: broker buy price = external price = can use either for P&L
- The external-only approach still works — it's just redundant for proper brokers

### 4. Corporate actions (splits, mergers)
EODHD's historical prices are adjusted for splits by default.
- This means the historical price on a buy date accounts for any subsequent splits
- No additional adjustment needed
- Verify this is true for JSE tickers specifically

### 5. Currency for US stocks
US stocks on EE's USD account:
- EODHD historical and current both in USD
- P&L calculated in USD
- Display to user in USD with optional ZAR conversion at current rate
