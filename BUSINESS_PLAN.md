# Sharez — Business plan
### The creator economy platform for investing in South Africa
#### Working name: Sharez

---

## Executive summary

Sharez is a social investing platform where South African investors share their real portfolios, write about their investment thinking, and monetise their expertise through paid subscriptions. Think Substack, but for investing — where every creator's portfolio is transparent, every trade is verifiable, and every note is tied to real skin in the game.

The platform targets the growing SA retail investing market, primarily Easy Equities and Interactive Brokers users who invest in both JSE and US stocks. Revenue comes from three layers: ETF provider partnerships, creator vault commissions, and premium tools.

No rand amounts are ever shown. Everything is expressed in percentages.

---

## Problem

South Africa has a fast-growing retail investing community with no home.

Investors currently discuss stocks on Twitter/X, Reddit, WhatsApp groups, and TikTok — all anonymous, unverified platforms where anyone can claim they bought Capitec at R800. There is no way to verify if someone actually holds what they say they hold, no way to follow an investor's real track record, and no structured way for knowledgeable investors to monetise their thinking.

Meanwhile, financial content creators in SA — people like Simon Brown (JustOneLap), The Finance Ghost, and a wave of younger finfluencers — monetise through courses, newsletters, and YouTube ads. None of these are tied to their actual portfolio. You can't see if they walk the talk.

Blossom solved this problem in Canada/US by requiring brokerage account linking and building a social layer on top. They've grown to 500K+ users and $4M revenue. But Blossom doesn't serve the SA market, and the infrastructure (SnapTrade, supported brokerages) doesn't exist here.

---

## Solution

Sharez gives every investor a transparent profile backed by their real portfolio. Creators write notes (short thoughts to deep-dive investment cases), set visibility tiers, and build a following. Followers see verified holdings, verified trades, and the creator's investment thinking — all in one place.

### Core features

**Portfolio transparency:** Users import their holdings via screenshot (AI-extracted), XLSX transaction history, or manual entry. Holdings are shown as percentage allocations — never rand amounts. Screenshot imports earn a "verified" badge.

**Notes system:** One flexible content type. A short note with no stock tag is a feed post. A long note tagged to a stock is an investment case. Creators control visibility per note: public, inner circle, or vault.

**Proof of trade:** Users screenshot their EE order confirmation, upload it, and AI extracts the trade details. The screenshot is stored as proof. Followers see a verified trade card in their feed with an optional note explaining the reasoning.

**Visibility tiers:**
- Public — top 5 holdings, overall return %, sector breakdown, free notes. The storefront.
- Inner circle — full holdings, per-holding P&L %, recent activity, inner-circle notes, trade alerts. The relationship.
- Vault — exclusive notes, trade reasoning, private Q&A, AI portfolio comparison. The paid tier.

**AI-powered features:**
- Stock summary card: plain-language summary, sentiment tags, community signals, news digest, risk note — generated per stock using Claude API + EODHD data.
- AI investing style label per creator.
- AI portfolio comparison (vault): subscriber's portfolio vs creator's.
- "What would they do?" (vault): ask a question about a stock, get answers based on the creator's investing history and style.

---

## Market

### South Africa retail investing

- Easy Equities has grown to become the dominant platform for beginner/retail SA investors, with fractional shares starting at R10.
- Interactive Brokers is growing among more experienced SA investors wanting direct US market access.
- Approximately 500,000+ active retail investors in SA, with the number growing as platforms like EE lower the barrier to entry.
- No social investing platform exists for the SA market.

### Target users

**Creators (supply side):**
- Financial content creators and finfluencers already active on Twitter/X, TikTok, YouTube.
- Experienced retail investors who enjoy sharing analysis and building a reputation.
- Ex-fund managers or financial professionals wanting to build a personal brand.
- Target: 100-500 active creators at launch.

**Followers (demand side):**
- Beginner investors on Easy Equities looking for guidance and inspiration.
- Intermediate investors wanting to benchmark their portfolio against others.
- Anyone interested in what real SA investors are actually buying.
- Target: 5,000-10,000 users in first 6 months.

---

## Revenue model

### Layer 1: ETF provider partnerships (primary revenue engine)

ETF providers in SA (Satrix, Sygnia, CoreShares, 10X Investments, Ashburton) spend significant marketing budgets trying to reach retail investors. Sharez offers them a unique channel: a platform where verified retail investors are actively discussing and comparing investment products.

**How it works:**
- Sponsored educational content: "Learn about index investing" modules presented by Satrix or Sygnia.
- Featured placement: "Most held ETF on Sharez" badges, ETF comparison tools sponsored by providers.
- Data insights: anonymised, aggregated portfolio data showing retail investor allocation trends. Fund providers pay for these reports to understand retail flows.

**Comparable:** Blossom generates $4M/year revenue, with 75% from ETF provider partnerships. State Street pays Blossom to promote SPY awareness among their 500K users.

**SA opportunity:** Even at a fraction of Blossom's scale, with 10-20K verified users, ETF provider partnerships could generate R50-200K/month.

### Layer 2: Vault commissions (creator monetisation)

Creators set their own vault subscription price. Sharez takes a 15-20% platform commission (aligned with Substack's model).

**Pricing spectrum:**
- Emerging creators: R99-199/month (accessible, high volume potential)
- Established finfluencers: R300-500/month (dedicated following)
- Expert analysts / ex-fund managers: R1,000-2,000/month (institutional-grade research for retail prices)

**Example unit economics:**
- Creator charges R500/month, has 200 vault subscribers = R100,000/month gross
- Sharez takes 15% = R15,000/month from one creator
- 20 active creators at this level = R300,000/month platform revenue

The vault price is uncapped — the market decides what each creator is worth. A single good stock pick from a respected analyst can pay for a year of subscription.

### Layer 3: Premium tools (future)

- Advanced portfolio analytics (sector exposure, geographic breakdown, benchmark comparison).
- AI-powered portfolio coaching.
- Tax reporting tools for SA investors.
- Priced as a user subscription: R49-99/month.

---

## Competitive landscape

| Platform | Market | Social? | Verified portfolios? | Creator monetisation? | SA focused? |
|----------|--------|---------|---------------------|----------------------|-------------|
| Blossom | Canada/US | Yes | Yes (SnapTrade) | No (Pro subscription only) | No |
| eToro | Global | Yes (copy trading) | Partial | Yes (Popular Investor) | No |
| Public.com | US | Yes | Partial | No | No |
| StockTwits | Global | Yes | No (anonymous) | No | No |
| EasyEquities | SA | No | N/A (is the broker) | No | Yes |
| Sharenet | SA | No (forums only) | No | No | Yes |
| **Sharez** | **SA** | **Yes** | **Yes (screenshot + XLSX)** | **Yes (vault system)** | **Yes** |

Sharez's unique position: the only platform combining verified portfolio transparency, creator monetisation, and SA market focus.

---

## Technical approach

### Portfolio import (no EE API available)

Easy Equities has blocked programmatic access via their OAuth system. Sharez uses three import methods:

1. **Screenshot import with AI (primary):** User screenshots their EE holdings page. Claude Vision extracts holdings into structured data. User confirms and saves. "EE verified" badge shown on profile.

2. **XLSX transaction history:** EE allows users to download transaction statements. Sharez parses these to reconstruct full trade history with dates and amounts.

3. **Manual entry:** User searches for stocks and enters holdings manually. No verification badge.

### Proof of trade

User screenshots EE order confirmation after a trade. Claude Vision extracts trade details (action, stock, date). Original screenshot stored as proof. Trade card posted to feed with optional note. Rand amounts extracted server-side but never shown to followers.

### Market data

- EODHD API ($20-60/month) for JSE + US fundamentals, historical prices, and news sentiment.
- Yahoo Finance (free, via yfinance) as backup for real-time JSE prices.
- Claude API for AI summaries, sentiment analysis, and portfolio coaching features.

### Future: SnapTrade integration

SnapTrade supports Interactive Brokers, which is growing in SA. IBKR-linked creators would get fully automated portfolio syncing and trade detection — the premium "verified" experience. This creates a natural hierarchy: IBKR-linked creators (fully verified, auto-synced) > EE screenshot creators (partially verified) > manual entry users (unverified).

### Tech stack

- Frontend: React Native (mobile) / Next.js (web)
- Backend: Node.js on Render
- Database: PostgreSQL
- AI: Anthropic Claude API (summaries, vision extraction, portfolio coaching)
- Market data: EODHD API
- Storage: Cloudflare R2 (screenshots)
- Auth: Standard email/password + Google OAuth

---

## Go-to-market strategy

### Phase 1: Creator seeding (month 1-2)

- Personally recruit 10-20 SA investing creators already active on Twitter/X and TikTok.
- Offer them early access, help them set up their profile, import their portfolio.
- These creators become the "anchor tenants" who attract followers.
- Key targets: Finance Ghost, Simon Brown, younger finfluencers with TikTok/Instagram followings.

### Phase 2: Community launch (month 2-4)

- Open to public sign-up.
- Creators share their Sharez profiles on their existing channels, driving follower sign-ups.
- Focus on the free tier — make the social feed, stock pages, and community features compelling enough to retain users without paying.

### Phase 3: Monetisation activation (month 4-6)

- Enable vault subscriptions for creators with 100+ followers.
- Begin outreach to ETF providers (Satrix, Sygnia) for partnership discussions.
- Pitch: "We have X thousand verified SA retail investors actively discussing ETFs on our platform."

### Phase 4: Scale (month 6-12)

- SnapTrade integration for Interactive Brokers users.
- Launch premium analytics tools.
- Expand creator base to include financial advisors and fund managers.
- Target first ETF provider partnership revenue.

---

## Financial projections (conservative)

### Year 1

| Metric | Target |
|--------|--------|
| Total users | 10,000 |
| Active creators with vault | 30 |
| Average vault price | R250/month |
| Average vault subscribers per creator | 50 |
| Vault GMV | R375,000/month |
| Platform commission (15%) | R56,250/month |
| ETF partnerships | R0 (building user base) |
| **Annual platform revenue** | **~R675,000** |

### Year 2

| Metric | Target |
|--------|--------|
| Total users | 50,000 |
| Active creators with vault | 100 |
| Average vault price | R350/month |
| Average vault subscribers per creator | 80 |
| Vault GMV | R2,800,000/month |
| Platform commission (15%) | R420,000/month |
| ETF partnerships (2-3 providers) | R100,000/month |
| Premium tools subscriptions | R50,000/month |
| **Annual platform revenue** | **~R6,840,000** |

### Year 3

| Metric | Target |
|--------|--------|
| Total users | 150,000 |
| Active creators with vault | 300 |
| Vault commission | R1,200,000/month |
| ETF partnerships (5+ providers) | R400,000/month |
| Premium tools | R200,000/month |
| **Annual platform revenue** | **~R21,600,000** |

---

## Funding requirements

### Bootstrap phase (current)

- R0 external funding required.
- Built by founder using Claude Code and existing tools.
- Hosted on Render (free/starter tier).
- Market data: EODHD starter plan (~R400/month).
- Claude API: pay-as-you-go (~R500-2000/month depending on usage).
- Total monthly burn: R1,000-3,000.

### Seed phase (at 10K users, if needed)

- R500,000-1,000,000 for:
  - Full-time development (hire 1-2 developers).
  - Marketing and creator acquisition.
  - SnapTrade integration licensing.
  - Market data upgrades.
  - Legal and compliance (FSCA considerations).

---

## Regulatory considerations

Sharez is not a broker, does not hold funds, and does not execute trades. It is a social platform and content marketplace. However:

- **FAIS Act:** If the platform or creators are deemed to be providing "financial advice," FSCA licensing may be required. Mitigation: clear disclaimers that Sharez is not financial advice, creators are sharing their personal portfolios and opinions, and users should do their own research.
- **POPIA:** User data (portfolios, holdings, notes) must be handled in compliance with South Africa's data protection law. Encrypted storage, clear consent mechanisms, and data deletion capabilities required.
- **Financial Intelligence Centre Act (FICA):** If processing payments for vault subscriptions, KYC may be required depending on payment processor and volume.

Legal review recommended before processing vault subscription payments.

---

## Team

- Founder: [Your name] — building the MVP solo using Claude Code.
- Advisory: To be recruited from SA fintech and investing community.

---

## Key risks

| Risk | Mitigation |
|------|-----------|
| EE tightens access further (blocks screenshots) | XLSX import and manual entry remain viable. SnapTrade/IBKR path as alternative. |
| Creators don't adopt | Pre-seed with known SA finfluencers before public launch. Make the free tier valuable enough on its own. |
| ETF providers don't pay | Build user base first. Data and distribution value becomes undeniable at 20K+ users. |
| Regulatory pushback | Proactive FSCA engagement. Clear "not financial advice" framing. Legal review early. |
| Blossom expands to SA | Unlikely near-term (no SA brokerage support). Sharez's local focus and EE-specific features are a moat. |
| JSE data costs escalate | Start with free/cheap sources (yfinance, EODHD). Negotiate directly with JSE at scale. |

---

## Summary

Sharez is a creator economy platform for investing, built specifically for the South African market. It combines verified portfolio transparency (via screenshot AI extraction), flexible creator monetisation (vault subscriptions with uncapped pricing), and AI-powered investing tools — all in a social feed designed for transparency and trust.

The business model is proven by Blossom ($4M revenue, 500K users) in Canada/US. Sharez adapts this model for SA, where no equivalent exists, and adds a creator monetisation layer that Blossom lacks.

The SA market is ready: Easy Equities has democratised investing, a generation of retail investors is actively seeking community and guidance, and financial content creators are already building audiences — they just lack a platform that ties their content to their real portfolios.

Sharez is that platform.
