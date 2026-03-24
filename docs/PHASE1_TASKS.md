# Sharez — Phase 1 Task List

**Goal:** Core product working + seeded with 10-20 creators
**Timeline:** Months 1-3
**Status key:** ✅ Done | 🔧 Needs fix | ❌ Not built | ⏸ Deferred

---

## 1. Authentication & Onboarding

| Task | Status | Notes |
|---|---|---|
| Email + password registration | ✅ | With @handle |
| JWT token auth | ✅ | 1-week expiry |
| Google OAuth | ❌ | Need Google Cloud Console setup. Use Supabase Auth or direct OAuth. |
| Onboarding intro slides | ✅ | 3 steps explaining the product |
| EE connection step in onboarding | ✅ | With skip option |
| Auto-follow demo accounts on signup | ✅ | New users see content immediately |
| Password reset flow | ❌ | No forgot password yet |
| Email verification | ❌ | No email confirmation on signup |

---

## 2. Portfolio Import & Verification

| Task | Status | Notes |
|---|---|---|
| XLSX transaction history upload | ✅ | Parses EE format, stores in user_transactions |
| Transaction dedup on re-import | ✅ | MD5 hash prevents duplicates |
| Holdings derived from transactions | ✅ | Aggregates buys - sells per stock |
| EE file structure verification | ❌ | Check sheet name, columns, fee patterns, date format |
| Fee consistency validation | ❌ | Verify broker commission = 0.25% of trade value |
| Price cross-validation with EODHD | ❌ | Check if price was within day's trading range |
| "Verified from EasyEquities" badge | 🔧 | Badge text exists but no actual verification checks |
| Account number tracking | ❌ | Store EE account number, flag if different on re-import |
| Import instructions (mobile + web) | ✅ | Hamburger → Transactions → Account → Download |
| Account type selector (ZAR/TFSA/USD/etc) | ✅ | Dropdown with 6 options |
| Success message with re-upload explanation | ✅ | Explains how to update going forward |
| PWA file handling | ✅ | manifest.json + service worker for "Add to Home Screen" |

---

## 3. Portfolio Display

| Task | Status | Notes |
|---|---|---|
| Own portfolio: summary cards | ✅ | Total Value, Gain/Loss, Return %, Top Performer |
| Own portfolio: holdings list | ✅ | HoldingCard with stock name, values |
| Own portfolio: allocation pie chart | ✅ | Recharts donut with legend |
| Live price refresh from EODHD | 🔧 | Code exists but prices may not update correctly for all stocks |
| Dynamic ticker resolution | ✅ | ticker_resolver.py matches EE names → EODHD tickers |
| Correct P&L calculation | 🔧 | Depends on price refresh working. current_value should ≠ purchase_value |
| Percentage-only view for others | ✅ | No rand amounts at any tier |
| Public tier: top 5 holdings only | ✅ | |
| "Verified from EasyEquities" badge on profile | ✅ | Shows import date |
| Portfolio calculation disclaimer | ✅ | "Estimated from transactions + market prices" |
| Allocation chart dots keeping shape | ✅ | shrink-0 fix |
| Empty state → link to Transactions | ✅ | |

---

## 4. Transactions Page

| Task | Status | Notes |
|---|---|---|
| Grouped by stock + date + action | ✅ | "Prosus · 4 orders · 379 shares" |
| Expand to see individual fills | ✅ | Shows qty and price per fill |
| Multi-select transactions | ✅ | Tap row to select, bold text |
| Share selected → note composer | ✅ | Opens modal with tagged transactions |
| Import button (big CTA if empty) | ✅ | |
| "Import more" button (top right if has data) | ✅ | |
| Shared badge + count | ✅ | |
| +/- expand buttons (not arrows) | ✅ | |
| Note modal width (not squished) | ✅ | max-w-lg |

---

## 5. Notes System

| Task | Status | Notes |
|---|---|---|
| Create notes (unlimited length) | ✅ | No character limit |
| Tag stock | ✅ | Inline input in composer |
| Tag transaction(s) | ✅ | Picker in composer + transactions page |
| Visibility: public/inner circle/vault | ✅ | |
| Like | ✅ | Heart icon, count |
| Comment (inline reply) | ✅ | Reply bar stays on feed |
| Restack (reshare as new note) | ✅ | Creates note with embedded original |
| Save (bookmark) | ✅ | Saved page at /saved |
| Locked note teasers | ✅ | Blurred preview + "Follow to unlock" |
| Thread view | ✅ | /note/:id with replies |
| Stock tag search-as-you-type | ❌ | Currently free text. Should search EODHD symbols. |
| Image attachment | ❌ | Button removed. Need Supabase storage integration. |
| Transaction embed in note card | ✅ | Green trade card with stock name + "Verified from EasyEquities" |
| Restacked note embed | ✅ | Embedded original note card |

---

## 6. Feed

| Task | Status | Notes |
|---|---|---|
| Unified feed (notes + transactions + restacks) | ✅ | |
| "For you" / "My community" scope toggle | ✅ | Blend shows all public, community shows followed only |
| Content filters: Notes / Transactions | ✅ | |
| "What's happening?" composer | ✅ | Substack-style with attachment bar |
| Composer: Stock tag button | ✅ | |
| Composer: Transaction tag button | ✅ | Shows grouped picker |
| Search | ✅ | Searches across note body, stock names, display names |
| Empty feed for new users | ✅ | Auto-follow + blend mode = never empty |

---

## 7. User Profiles

| Task | Status | Notes |
|---|---|---|
| Display name + @handle | ✅ | |
| Bio | ✅ | Editable in Settings |
| Social links (LinkedIn, Twitter, website) | ✅ | |
| Avatar (initials, deterministic color) | ✅ | No photo upload yet |
| Profile photo upload | ❌ | Need Supabase storage |
| Follower / following counts | ✅ | |
| Portfolio tab (percentage view) | ✅ | Pie chart, holdings by weight, return % |
| Notes tab | ✅ | |
| Dual-market split (JSE vs USD) | ✅ | |
| Account breakdown (TFSA/ZAR/USD) | ✅ | |
| Social links shown on profile | ✅ | LinkedIn, Twitter, Website icons |
| "Verified from EasyEquities" badge | ✅ | With import date |

---

## 8. Follow System

| Task | Status | Notes |
|---|---|---|
| Follow button (3 states) | ✅ | Follow → Requested → Following |
| Vault subscribe with popup | ✅ | Shows price + what's included |
| Auto-accept toggle | ✅ | Per inner circle tier |
| Connections page with tier filters | ✅ | All / Requests / Inner Circle / Vault |
| Approve / reject follow requests | ✅ | |
| Grant VIP vault access | ✅ | |
| Unfollow | ✅ | |

---

## 9. Stock Pages

| Task | Status | Notes |
|---|---|---|
| Stock header (ticker badge, price, change) | ✅ | Teal for JSE, blue for US |
| Sparkline chart (1 year) | ✅ | SVG with fill |
| Community bar (holders, recent buys/sells) | ✅ | Scoped to followed users |
| AI Summary (Claude API) | ✅ | Quick take, sentiment, metrics, news, risk |
| Historical performance in AI prompt | ✅ | 1m/3m/6m/1yr changes |
| Notes tab with sort/filter | ✅ | Recent/Oldest, Following/Everyone |
| Follow stock → watchlist | ✅ | |
| Share button | ⏸ | Removed for now |
| Sector display | ✅ | Hardcoded map + EODHD |
| Dynamic ticker resolution | ✅ | ticker_resolver.py |
| Per-tab filters when viewing from profile | ✅ | User / Following / Everyone |

---

## 10. Discover & Search

| Task | Status | Notes |
|---|---|---|
| Search users by name or handle | ✅ | |
| Creator cards with follow button | ✅ | |
| Follower count + bio preview | ✅ | |
| Search stocks (EODHD) | ❌ | No stock search page. Only user search. |
| Filter by investing style / sector | ❌ | No filters beyond text search |

---

## 11. Settings & Tier Config

| Task | Status | Notes |
|---|---|---|
| Edit profile (name, bio, handle, social links) | ✅ | |
| Tier settings accordion | ✅ | Grouped checkboxes with preview |
| Auto-accept followers toggle | ✅ | |
| Vault pricing | ✅ | |
| EE connection form | ✅ | Works but EE API is blocked |
| Install app (PWA) instructions | ✅ | iOS, Android, Desktop |

---

## 12. Watchlist

| Task | Status | Notes |
|---|---|---|
| Dedicated /watchlist page | ✅ | |
| Follow/unfollow stocks | ✅ | |
| Alphabetical list | ✅ | |
| Links to stock detail | ✅ | |

---

## 13. Infrastructure & DevOps

| Task | Status | Notes |
|---|---|---|
| Render hosting | ✅ | Auto-deploy from GitHub |
| Supabase PostgreSQL | ✅ | Connection pooler |
| Render API for env var management | ✅ | |
| Column migrations on startup | ✅ | ALTER TABLE for new columns |
| Seed data (3 demo accounts) | ✅ | Thabo, Sarah, Lebo |
| Error handling / graceful failures | 🔧 | Some endpoints could crash ungracefully |
| Rate limiting | ❌ | No rate limiting on API endpoints |
| CORS properly configured | ✅ | |
| Security: JWT secret warning | ✅ | Logs warning if using default |

---

## 14. Mobile Responsiveness

| Task | Status | Notes |
|---|---|---|
| Bottom nav bar on mobile | ✅ | 5 items |
| Sidebar hidden on mobile | ✅ | |
| Pages usable on phone | 🔧 | Functional but not optimized. Modals can be squished. |
| Touch targets adequate | 🔧 | Some buttons too small on mobile |
| Viewport meta tag | ✅ | No zoom, responsive |

---

## 15. Documentation

| Task | Status | Notes |
|---|---|---|
| PRD.md | ✅ | Complete feature documentation |
| INTEGRATIONS.md | ✅ | All external data sources |
| BUSINESS_PLAN.md | ✅ | Full business plan |
| ROADMAP.md | ✅ | 5-phase product roadmap |
| TRANSACTION_VERIFICATION.md | ✅ | Verification approach + broker list |
| PHASE1_TASKS.md | ✅ | This document |

---

## Summary

| Category | Done | Needs Fix | Not Built | Total |
|---|---|---|---|---|
| Auth & Onboarding | 5 | 0 | 3 | 8 |
| Portfolio Import | 8 | 1 | 4 | 13 |
| Portfolio Display | 9 | 2 | 0 | 11 |
| Transactions Page | 9 | 0 | 0 | 9 |
| Notes System | 11 | 0 | 2 | 13 |
| Feed | 8 | 0 | 0 | 8 |
| User Profiles | 11 | 0 | 1 | 12 |
| Follow System | 7 | 0 | 0 | 7 |
| Stock Pages | 10 | 0 | 0 | 10 |
| Discover | 3 | 0 | 2 | 5 |
| Settings | 6 | 0 | 0 | 6 |
| Watchlist | 4 | 0 | 0 | 4 |
| Infrastructure | 8 | 1 | 1 | 10 |
| Mobile | 3 | 2 | 0 | 5 |
| Documentation | 6 | 0 | 0 | 6 |
| **Total** | **108** | **6** | **13** | **127** |

**Phase 1 completion: 85% done, 5% needs fixes, 10% not built**

---

## Priority order for remaining work

### Must fix before beta (this week)
1. Portfolio price refresh — verify EODHD prices updating correctly
2. EE file verification checks — structural fingerprint validation
3. Mobile responsiveness pass — ensure core flows work on phone

### Should build before beta
4. Google OAuth — faster signup for new users
5. Password reset — users will forget passwords
6. Stock search in note composer — EODHD search-as-you-type

### Can defer to post-beta
7. Profile photo upload
8. Image attachments on notes
9. Stock search/discover page
10. Rate limiting
11. Email verification
12. Filter discover by investing style
