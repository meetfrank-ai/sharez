# Sharez — Transaction File Verification

## The problem

Users upload XLSX files claiming to be from EasyEquities (or other brokers). We need to verify these files are genuine and untampered, not fabricated in Excel.

---

## Verification signals we can check

### 1. File structure fingerprinting (strong)

Each broker's export has a unique file structure — column names, sheet names, header patterns, date formats, fee line items. A fabricated file would need to match all of these exactly.

**EasyEquities fingerprint (verified from real export):**
- Sheet name: `"Transaction History"`
- 3 columns only: `Date`, `Comment`, `Debit/Credit`
- Row 2 always: `"Account Balance Carried Forward"` with total
- Buy format: `"Bought {stock} {qty} @ {price}"`
- Sell format: `"Sold {stock} {qty} @ {price}"`
- Fee lines always follow buys: `"Broker Commission"`, `"Buy Brokerage Fee Discount with Thrive"`, `"Settlement and administration"`, `"Investor protection levy (IPL)"`, `"Securities transfer tax"`, `"Value Added Tax on costs (VAT)"`
- Inter-account transfers reference account numbers: `"EE-{number}"`
- Date format: `YYYY-MM-DD HH:MM:SS` (datetime objects in Excel)

**Verification checks to implement:**
```python
def verify_ee_xlsx(workbook):
    ws = workbook.active
    checks = {
        "sheet_name": ws.title == "Transaction History",
        "col_a_header": ws.cell(1, 1).value == "Date",
        "col_b_header": ws.cell(1, 2).value == "Comment",
        "col_c_header": ws.cell(1, 3).value == "Debit/Credit",
        "balance_row": "Account Balance Carried Forward" in str(ws.cell(2, 2).value or ""),
        "has_broker_fees": any("Broker Commission" in str(ws.cell(r, 2).value or "") for r in range(2, min(50, ws.max_row))),
        "has_settlement": any("Settlement and administration" in str(ws.cell(r, 2).value or "") for r in range(2, min(50, ws.max_row))),
        "has_vat": any("Value Added Tax" in str(ws.cell(r, 2).value or "") for r in range(2, min(50, ws.max_row))),
        "date_is_datetime": isinstance(ws.cell(2, 1).value, datetime),
    }
    score = sum(checks.values()) / len(checks)
    return score, checks
```

A real EE file scores 9/9. A fabricated file would need to include fake broker fees, VAT, settlement costs — all with correct wording. Possible but much harder than just editing stock names.

### 2. Fee consistency checks (medium)

EasyEquities charges specific fees on each trade:
- Broker commission: 0.25% of trade value
- Settlement and admin: ~0.08%
- IPL: ~0.0003%
- Securities transfer tax: 0.25% (buys only)
- VAT: 15% on fees

**Check:** For each buy transaction, verify that the fee lines that follow it are mathematically consistent with the trade amount. If someone changes the stock name or amount but doesn't update the fees, the ratios will be off.

### 3. Account number cross-referencing (medium)

EE files contain account numbers (e.g. `EE-14858500`) in inter-account transfer lines. We can:
- Store the account number on first import
- On subsequent imports, verify the same account number appears
- Flag if a different account number shows up (could be a different person's file)

### 4. Chronological consistency (weak but useful)

- Dates should be in order (most recent first or oldest first, consistently)
- No gaps that don't correspond to weekends/holidays
- Transaction times should fall within JSE trading hours (09:00-17:00 SAST) for equity trades

### 5. Cross-validation with market data (strong)

For each buy/sell transaction, check if the price `@ {price}` was a valid market price for that stock on that date. Query EODHD for the day's high/low:
```
If transaction price < day_low OR transaction price > day_high → FLAG
```
A fabricated file would need to know the exact trading range for every stock on every date.

---

## Verification badge system

| Level | Requirements | Badge |
|---|---|---|
| **Verified** | File passes all structural checks + fee consistency + price validation | Green shield ✓ |
| **Imported** | File passes structural checks but some validation skipped | Blue shield |
| **Unverified** | Manual entry or file failed checks | No badge |

---

## SA Brokers to Support

### Priority 1 (largest SA retail user base)

| Broker | Export Format | Import Status | Notes |
|---|---|---|---|
| **EasyEquities** | XLSX (Transaction History) | ✅ Built | Largest SA retail platform. XLSX verified and parsed. |
| **Satrix** | Unknown | ❌ Not built | Same parent company as EE (Purple Group). May have similar export format. |

### Priority 2 (growing SA user base)

| Broker | Export Format | Import Status | Notes |
|---|---|---|---|
| **Interactive Brokers (IBKR)** | CSV, Flex Query (XML) | ❌ Not built | Growing among experienced SA investors. SnapTrade integration possible (Phase 4). Well-documented API. |
| **Standard Bank Online Share Trading** | PDF statements | ❌ Not built | Large bank, many users. Would need PDF parsing. |
| **FNB Share Investing** | PDF statements | ❌ Not built | Similar to Standard Bank — PDF-based. |
| **Nedbank Online Trading** | Unknown | ❌ Not built | Smaller user base. |

### Priority 3 (international brokers used by SA investors)

| Broker | Export Format | Import Status | Notes |
|---|---|---|---|
| **Charles Schwab** | CSV | ❌ Not built | Some SA investors use for US stocks. |
| **Saxo Bank** | CSV, API (OpenAPI) | ❌ Not built | Has full API — direct integration possible (Phase 4). |
| **IG Markets** | CSV | ❌ Not built | Popular for CFDs/derivatives. Different model. |

### Priority 4 (unit trust / retirement platforms)

| Broker | Export Format | Import Status | Notes |
|---|---|---|---|
| **Allan Gray** | PDF statements | ❌ Not built | Huge SA asset manager. Unit trusts, not equities. |
| **Coronation** | PDF statements | ❌ Not built | Similar to Allan Gray. |
| **10X Investments** | Unknown | ❌ Not built | Growing challenger. |
| **Sygnia** | Unknown | ❌ Not built | Index fund provider. |

---

## Implementation plan

### Now (v1)
- Add structural fingerprint verification for EasyEquities XLSX
- Show "Verified from EasyEquities" badge when checks pass
- Store verification score in database

### Phase 2
- Add fee consistency validation
- Add price cross-validation with EODHD market data
- Add IBKR CSV parser

### Phase 3
- Add PDF parsing for Standard Bank / FNB statements
- Add Satrix XLSX parser (likely similar to EE format)

### Phase 4
- SnapTrade integration for auto-verification (IBKR, Saxo)
- No file upload needed — direct read-only broker connection
