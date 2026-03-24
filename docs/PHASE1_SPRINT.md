# Sharez — Phase 1 Sprint Tasks

Each task has: description, acceptance criteria, implementation steps, and test plan.

---

## MUST FIX BEFORE BETA

---

### Task 1: Portfolio Price Refresh

**Problem:** Holdings show `current_value = purchase_value` so P&L is always 0%. EODHD price refresh exists in code but doesn't work reliably for all stocks.

**Acceptance Criteria:**
- After importing transactions, holdings show current market prices (not purchase prices)
- P&L% is non-zero for stocks that have moved since purchase
- Top Performer shows the actual best performer
- Prices auto-refresh if older than 1 hour when viewing portfolio
- Stocks without EODHD data show "Price unavailable" instead of 0%

**Implementation Steps:**
1. Fix `_refresh_holdings_prices()` in `ee_import.py` — log which stocks succeed/fail
2. Handle stocks with no EODHD ticker gracefully (unit trusts, ETFs)
3. Add a manual "Refresh prices" button on portfolio page
4. Show "last price update" timestamp per holding
5. If current_value == purchase_value and stock has no EODHD data, don't show P&L (show "—")

**Test Plan:**
```bash
# 1. Import your real transaction XLSX
# Upload via Transactions page → Import

# 2. Check holdings have updated prices
TOKEN=$(curl -s -X POST "https://sharez.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASS"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s "https://sharez.onrender.com/api/portfolio/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
for h in json.load(sys.stdin):
    pv = h.get('purchase_value', 0)
    cv = h.get('current_value', 0)
    diff = 'SAME' if pv == cv else f'DIFFERENT (pv={pv:.0f} cv={cv:.0f})'
    print(f'{h[\"stock_name\"]}: {diff}')
"

# Expected: Stocks with EODHD data show DIFFERENT values
# Stocks without data show SAME (acceptable)

# 3. Check EODHD ticker resolution
curl -s "https://eodhd.com/api/eod/PRX.JSE?api_token=KEY&fmt=json&from=2026-03-20&to=2026-03-24" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Prosus: {len(d)} data points')"

# 4. UI check: Portfolio page
# - Total Value should NOT equal Total Invested (if stocks have moved)
# - Return % should NOT be 0.00% for all stocks
# - Top Performer should name an actual stock
```

---

### Task 2: EasyEquities File Verification

**Problem:** No verification that uploaded XLSX is genuinely from EasyEquities. Users could fabricate files.

**Acceptance Criteria:**
- On upload, 9 structural checks run against the file
- Verification score stored with the import
- "Verified from EasyEquities" badge only shows if score ≥ 8/9
- "Imported" badge shows if score ≥ 5/9
- No badge if score < 5
- Fee consistency check on at least 3 random transactions
- User sees verification result after import

**Implementation Steps:**
1. Add `verify_ee_xlsx()` function to `ee_import.py`
2. Run verification before parsing transactions
3. Store verification score on User model (`import_verification_score`)
4. Return score in import response
5. Frontend shows badge based on score
6. Add fee consistency check: for each buy, verify broker commission ≈ 0.25% of amount

**Test Plan:**
```bash
# 1. Upload real EE file → should score 9/9
# Check import response includes verification_score

# 2. Create a fake XLSX with just Date/Comment/Debit columns
# but wrong sheet name → should score lower

# 3. Create a fake XLSX with correct structure but wrong fee ratios
# → fee consistency check should flag it

# 4. UI check:
# - After import, see "Verified from EasyEquities ✓" (green) if score ≥ 8
# - Profile shows the same badge
# - Other users see the badge when viewing your profile

# 5. API check:
curl -s "https://sharez.onrender.com/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Import verified: {d.get(\"import_verification_score\", \"not set\")}')
"
```

---

### Task 3: Mobile Responsiveness

**Problem:** Pages functional but not optimized for phone screens. Modals squished, text overflows, touch targets too small.

**Acceptance Criteria:**
- All pages usable on iPhone SE (375px) and standard Android (360px)
- Modals take full width on mobile with proper padding
- No horizontal scroll on any page
- Touch targets minimum 44px
- Feed composer usable on mobile
- Transaction picker scrollable
- Stock page readable without horizontal scroll
- Import modal steps all fit on one screen

**Implementation Steps:**
1. Import modal: full screen on mobile (`max-w-full md:max-w-md`)
2. Note composer modal: full screen on mobile
3. Feed composer: test on 375px width
4. Transaction page: ensure grouped rows don't overflow
5. Stock detail: sparkline and community bar responsive
6. Portfolio page: summary cards stack on mobile (grid-cols-2 is fine)
7. All modals: add `overflow-y-auto` and `max-h-[90vh]`
8. Increase padding on mobile bottom nav to avoid system gestures

**Test Plan:**
```
Manual testing in Chrome DevTools:
1. Set viewport to 375 × 667 (iPhone SE)
2. Test each page:
   □ /login — form fits, buttons tappable
   □ /onboarding — slides readable, buttons full width
   □ / (feed) — composer opens, notes readable, reply bar works
   □ /portfolio — cards stack in 2 columns, chart visible
   □ /transactions — rows readable, expand works, import modal fits
   □ /stock/X — header, sparkline, AI summary all visible
   □ /user/X — profile readable, tabs work
   □ /discover — search bar + cards fit
   □ /watchlist — list readable
   □ /saved — list readable
   □ /followers — tabs + filters fit
   □ /profile (settings) — forms usable
   □ /tier-settings — accordion opens, checkboxes tappable

3. Set viewport to 360 × 640 (Android)
4. Repeat above checks

5. Test on actual phone (if available):
   □ Open sharez.onrender.com in Safari/Chrome
   □ All above checks
   □ "Add to Home Screen" works
   □ App opens from home screen in standalone mode
```

---

## SHOULD BUILD BEFORE BETA

---

### Task 4: Google OAuth

**Problem:** Only email+password login. Google OAuth reduces friction for new signups.

**Acceptance Criteria:**
- "Continue with Google" button on login page
- Creates account with email from Google
- Auto-generates handle from Google name if not taken
- Works on both web and PWA
- Existing email+password users can link Google later (v2, not required)

**Implementation Steps:**
1. Create Google Cloud project + OAuth credentials (client ID/secret)
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Render env vars
3. Backend: Add `/api/auth/google` endpoint that verifies Google ID token
4. Frontend: Add Google Sign-In button using `@react-oauth/google` package
5. On success: check if email exists → login, else → create user + tier config
6. Auto-generate handle: `firstName_lastName` lowercased, append number if taken

**Test Plan:**
```
1. Click "Continue with Google" on login page
2. Google popup appears, select your Google account
3. Redirected back to Sharez
4. Profile shows your Google name and email
5. Handle auto-generated (e.g. @lynette_duplessis)
6. Logout → login again with Google → same account

API test:
# Get a Google ID token (from the frontend flow)
curl -s -X POST "https://sharez.onrender.com/api/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"id_token":"GOOGLE_TOKEN_HERE"}' | python3 -m json.tool
# Should return: {"access_token": "...", "token_type": "bearer"}
```

---

### Task 5: Password Reset

**Problem:** No way to recover account if password forgotten.

**Acceptance Criteria:**
- "Forgot password?" link on login page
- Enter email → receive reset link (or code)
- Click link → set new password
- Old password no longer works
- Rate limited: max 3 reset requests per hour per email

**Implementation Steps:**
1. Add `password_reset_token` and `password_reset_expires` to User model
2. `POST /api/auth/forgot-password` — generates token, stores in DB, sends email
3. `POST /api/auth/reset-password` — verifies token, updates password hash
4. Email sending: use Supabase's built-in email or a service like Resend/SendGrid
5. Frontend: Forgot password page with email input
6. Frontend: Reset password page (from email link) with new password input
7. Token expires after 1 hour

**Test Plan:**
```
1. Go to /login → click "Forgot password?"
2. Enter your email → submit
3. Check email for reset link
4. Click link → enter new password
5. Login with new password → should work
6. Login with old password → should fail

API test:
curl -s -X POST "https://sharez.onrender.com/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
# Should return: {"message": "Reset link sent"}

# Then with the token from email:
curl -s -X POST "https://sharez.onrender.com/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_EMAIL","new_password":"newpass123"}'
# Should return: {"message": "Password reset"}
```

---

### Task 6: Stock Search in Note Composer

**Problem:** Stock tag in composer is free text. Should search EODHD for real stock names/tickers.

**Acceptance Criteria:**
- Type in stock field → results appear after 2+ characters
- Results show: stock name, ticker, exchange
- Selecting a result sets stock_tag to the EODHD ticker and stock_name correctly
- Debounced: doesn't fire on every keystroke (300ms delay)
- Shows "No results" if nothing found
- Works for both JSE and US stocks

**Implementation Steps:**
1. Backend: Add `GET /api/stocks/search?q=X` endpoint
2. Uses EODHD search API: `https://eodhd.com/api/search/{query}?api_token=KEY`
3. Also searches the cached JSE symbol list (ticker_resolver.py)
4. Returns top 10 results: `{name, ticker, exchange, code}`
5. Frontend: Replace free text input with autocomplete component
6. Debounce 300ms, min 2 characters
7. Dropdown shows results, click to select
8. Selected stock sets `composerStockTag` to `{CODE}.{EXCHANGE}` and `composerStockName`

**Test Plan:**
```
1. Open feed composer → click "Stock" button
2. Type "Cap" → should show "Capitec Bank Holdings (CPI.JSE)"
3. Type "Pros" → should show "Prosus N.V. (PRX.JSE)" and "Prosus (PRX.AS)"
4. Type "Apple" → should show "Apple Inc (AAPL.US)"
5. Select a result → pill appears with correct name
6. Post note → note has correct stock tag linking to stock page

API test:
curl -s "https://sharez.onrender.com/api/stocks/search?q=capitec" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
# Should return array of matching stocks
```

---

## CAN DEFER TO POST-BETA

---

### Task 7: Profile Photo Upload

**Description:** Upload avatar image instead of using generated initials.
**Implementation:** Supabase storage bucket + upload endpoint + URL stored on User model.
**Test:** Upload image → appears on profile, feed, comments.

### Task 8: Image Attachments on Notes

**Description:** Attach images to notes (charts, screenshots, memes).
**Implementation:** Supabase storage + `image_url` on Note model (column exists). Upload in composer.
**Test:** Attach image → appears below note body in feed.

### Task 9: Stock Search/Discover Page

**Description:** Dedicated page to search and browse stocks (not just users).
**Implementation:** New /stocks route, EODHD search, trending stocks from community data.
**Test:** Search "Capitec" → shows stock page link with price and community holders.

### Task 10: Rate Limiting

**Description:** Prevent abuse of API endpoints.
**Implementation:** `slowapi` package with per-IP and per-user limits.
**Test:** Hit login 50 times → get 429 after limit.

### Task 11: Email Verification

**Description:** Verify email address on signup.
**Implementation:** Send verification email with token, mark user as verified.
**Test:** Register → check email → click link → account verified.

### Task 12: Discover Filters

**Description:** Filter users by investing style, sector focus, return %.
**Implementation:** Backend query params, frontend filter UI.
**Test:** Filter "Financials" → shows users heavy in financial stocks.

### Task 13: Error Handling

**Description:** Graceful error messages instead of 500 crashes.
**Implementation:** Try/catch on all endpoints, React error boundary.
**Test:** Invalid API call → user sees friendly error, not blank screen.
