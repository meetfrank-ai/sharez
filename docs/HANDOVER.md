# Sharez — handover for review

*Last updated: 2026-05-03. State of the deploy at https://sharez.onrender.com.*

---

## What Sharez is, in one paragraph

Sharez is a South African social investing app for retail DIY investors. The wedge is the **Crystal Ball Challenge** — 500 invited investors pick 5 JSE stocks, write a locked thesis per pick, and run them as a paper portfolio for a year. Anyone with a Sharez account can spectate: read the picks, follow participants, comment, watch the leaderboard. The challenge is the launch event that gets people through the door; the social network — verified portfolios from emailed broker confirmations, follows, notes, theses — is what they stay for. Privacy posture is distinct: percentages only, never rand amounts. That's both the regulatory story and the differentiation versus Sirius Signals or Public.com.

## The user journey

**Day 0 — invited participant**
1. Receives an invite code from a beta user (each beta user has 4 codes) or directly from Sharez (the 100 we allocate by name).
2. Lands on `/challenges/crystal-ball/join?code=…`, redeems, signs up.
3. Connects Gmail (read-only, scoped to `info@easyequities.co.za`). This is optional but expected — it's how their portfolio shows up on their profile.
4. Submits 5 JSE picks with a thesis per pick. Edits freely until the lockup timestamp; theses become immutable after.
5. Their challenge profile is now public. Anyone with a Sharez account can read it and follow them.

**Day 0 — uninvited spectator**
1. Sees a Crystal Ball post on social, lands on the challenge page.
2. Signs up (no invite code needed for viewing). Same onboarding as a participant minus picks.
3. Browses the leaderboard. Clicks into a participant. Reads their 5 picks + theses. Follows the ones whose thinking they like.
4. Their feed is now seeded with content from the participants they follow — note posts, shared transactions, thesis updates.
5. Eventually they connect their own Gmail and start posting their own theses on stocks they hold. Now they're a Sharez user, not just a Crystal Ball viewer.

**Month 3, Month 6, Month 9** — participants get prompted to add an update to each thesis. Originals stay frozen, updates stack underneath. This keeps the challenge page producing content over the year, not just on Day 0.

**Month 12** — the year ends. Winners are visible, losers are visible, theses are intact. Some participants will have built large followings. Year 2 is either Sharez-run again with new participants, or opens up to user-created challenges.

## The Crystal Ball Challenge — the launch wedge

The mechanic in detail:

- **500 invited participants.** Picks are gated. Spectating is not.
- **5 JSE stocks each.** Equal-weighted paper portfolio. No real money.
- **One locked thesis per pick.** Original body cannot change. Updates can be appended quarterly.
- **Performance computed daily** from EODHD close prices. Equal-weighted return % across the 5 picks vs the lockup-day close.
- **Year-long lockup.** Picks cannot change.
- **Public commentary** on each pick — anyone can comment.

The structural inversion is the important sentence: **only 500 can play, but anyone can watch.** Spectators are the audience that makes the leaderboard meaningful, and they're the long-tail of platform users we actually want.

**Why this works as a launch event:**

- Status: invite-only creates the hook to even engage with it. The 100 founding beta users each get 4 invites — that's the social-network seeding mechanism baked into the launch.
- Time horizon: a year is long enough that the leaderboard has narrative arc. Stocks rotate, theses get vindicated or destroyed, comments accumulate.
- Spectator economics: the 500 produce the content; the 5,000–50,000 spectators produce the engagement and word-of-mouth.
- Architectural reuse: every challenge entry is structurally just 5 theses with a `challenge_id` and `is_locked=True`. Year 2 user-created challenges are a config change, not a rebuild.

**What's at risk if we're wrong about it:**

- If the leaderboard isn't browsed daily by the audience, the challenge becomes a Day-0 promotional event with no second act.
- If thesis quality is bad ("Naspers go up because Tencent good"), the read-experience is hollow and spectators don't return. Mitigation: lockup form has a 10-character minimum on the body, but that's the floor — the participant agreement should set the actual bar.
- If the 100 invites Sharez allocates directly aren't recognizable / credible-feeling investors, the launch lacks signal. This is a BD lift, not a product lift.

## The social network — what they stay for

Outside the challenge, the platform is a verified-portfolio social network. Primitives:

- **Profile** — public page showing % allocations, cumulative portfolio % chart (NOT YET BUILT — flagged), notes, theses, shared transactions.
- **Follow** — one-way. Following someone surfaces their content in your feed.
- **Notes** — short-form posts. Optional ticker tag.
- **Theses** — long-form posts tied to a specific stock. Immutable once posted; append-only updates. Same primitive Crystal Ball uses.
- **Shared transactions** — when a user makes an EE trade, they can opt in to share it. The card shows: stock, action (buy/sell), allocation %, optional caption. Never shares: shares count, price per share, total rand value.
- **DMs and group chats** — NOT YET BUILT. 1:1 messaging plus small private group threads (replacing the previously-planned "pods" concept — no shared group identity, just chat).
- **Cumulative portfolio chart** — NOT YET BUILT. Per profile. % return over time, computed from imported EE transactions back to the user's earliest emailed confirmation. This is the credibility surface — without it, a profile is just a list of percentages with no track record.

The social network is read-only-display: Sharez never advises, never intermediates, never suggests trades. Users opt-in per transaction to share. Public sharing is OFF by default for any newly-imported trade.

## What's built today (state of the deploy)

| Surface | State |
|---|---|
| Login (email/password + Google sign-in) | ✅ Live; Google login has a hardcoded fallback so dashboard env-var lag doesn't lock anyone out |
| Gmail OAuth + EE email parsing | ✅ Live; tested against real confirmation emails |
| Onboarding (3 intro slides + Settings → Connect Gmail) | ✅ Live |
| Decoupled "Link EasyEquities" page with full privacy explainer | ✅ Live at `/link-account` |
| Settings page (Gmail status, sync, disconnect, change-email, tier config) | ✅ Live |
| Feed (For You / Friends tabs, notes, theses, shared trades) | ✅ Live |
| Notes | ✅ Live (existing) |
| Theses | ✅ Live (now with `title`, `is_locked`, append-only updates) |
| TradeCard (broker badge, position pill, allocation %, sparkline, comment + view-stock) | ✅ Live, rand-stripped per privacy posture |
| Onboarding checklist (5 steps, auto-marks on action) | ✅ Live |
| Notifications (bell, dropdown, hooks on follow/like/reply/reaction) | ✅ Live |
| Right-rail Friends panel (xl+ widths) | ✅ Live |
| Per-transaction display toggle (rand / USD / private %) | ✅ Live on `/transactions` |
| **Crystal Ball Challenge (schema, endpoints, all 5 frontend pages, daily cron)** | **✅ Live, awaiting seed run + invite code distribution** |
| Stock search (JSE + global via EODHD) | ✅ Live |
| Pytest scaffold (13 tests, parser + OAuth) | ✅ Live |

| Not yet built (highest priority first) | Status |
|---|---|
| **Cumulative portfolio % chart on profiles** | Pending — biggest gap; this is the credibility surface for non-challenge content |
| **DMs (1:1)** | Pending |
| **Group chats** | Pending — lightweight multi-participant messaging |
| **Stock detail page integration** ("X challenge participants picked this") | Pending |
| Email-statement parsing for non-EE SA brokers | Pending |
| Crypto integrations (Luno, VALR API keys) | Pending |
| Self-custody wallet lookup (ETH/BTC) | Pending |
| T&Cs draft (legal precondition for public launch) | Pending |
| POPIA compliance hardening | Pending |
| FSCA Innovation Hub conversation | Pending |

## Privacy and regulatory posture

This is deliberate and load-bearing for the product positioning, so worth stating plainly.

- **Sharez is a read-only display platform.** It does not advise, intermediate, or solicit. T&Cs will state this explicitly.
- **No copy-trading, no automated execution.** Adding either crosses into FAIS territory and would require a Cat I or Cat II FSP licence.
- **Rand amounts are never shown publicly.** Allocation %, return %, and position state (Opening / Adding) are the only quantitative surfaces. The owner sees their own rand on `/transactions` with a per-row toggle.
- **Per-integration, per-account, per-data-type opt-in consent** with one-click revocation (Settings → Disconnect Gmail).
- **Public sharing is OFF by default** for every newly-imported trade — the user opts in to share each one.
- **Gmail integration scope is `gmail.readonly`** — the most restrictive scope that lets us read messages. We never send, label, modify, or delete email. Sender allow-list filters every message before parsing — only `info@easyequities.co.za` is read.
- **Refresh tokens are encrypted at rest** with Fernet (AES-128). Access tokens live in memory only.
- **Crystal Ball leaderboard is %-only.** Copy is "highest return so far," not "best investors" or "winners." Avoids implying Sharez is making a skill judgment.

The first conversation we should book post-launch (or pre-launch — cheaper) is with the **FSCA Innovation Hub** via the Intergovernmental FinTech Working Group. They run a sandbox-style engagement program; getting them comfortable with the model now is much cheaper than answering a directive later.

## Open decisions worth your input

1. **Invite-code distribution attribution.** Codes are currently first-redeem-wins, not pre-attributed to specific beta users. If you want each beta user to see "your invite was used by X" (which would be a nice growth-loop surface), we'd add code-attribution at mint time. Decide before distribution.
2. **Lockup window.** Default seed is 7 days from seed time. Likely too short — needs to align with the launch announcement. Probably a minimum 14 days for invitees to actually pick stocks and write theses.
3. **Editorial review of theses before lockup?** No mechanism for this exists. If we want quality control on what becomes public, we need either a soft-launch period where Sharez can flag low-effort theses (and the participant gets a chance to revise), or a participant agreement that sets the bar.
4. **The 100 directly-allocated invites.** Who? List should include 5–10 recognizable SA investing voices for signal. BD lift, not engineering.
5. **Cumulative portfolio chart before or after launch?** Strong recommendation to ship before. Without it, profiles outside the Crystal Ball context are list-of-percentages without a track record. Doable in a couple of working days.

---

## My honest take, for the brief

I built this. Some genuine views:

**What's working architecturally.**

- The thesis-as-primitive design is right. Crystal Ball is structurally just five theses with a lockup timestamp — user-created challenges in year 2 become a config change. This compounds.
- Gmail-as-ingestion is more durable than the broker scrape we started with. ToS-clean, scope-minimal, and the same `gmail.readonly` flow extends to bank-broker email statements (Standard Bank, FNB, Absa) when we get there.
- The percentages-only privacy posture differentiates Sharez sharply from Sirius/Public.com and aligns naturally with POPIA data minimisation. Good defensive moat.

**What I'm worried about.**

- **Spectator stickiness.** "Anyone can watch" is the strategic claim, but watching strangers' stock picks isn't inherently fun. The leaderboard updates daily and produces a number; it doesn't produce a story. The story has to come from (a) commentary by participants, (b) thesis updates, (c) cross-references on stock pages ("Sarah picked Naspers, Lebo also picked it, here's both their theses"). Surface (c) is not built. Without it, spectators visit on launch day and don't return until somebody big wins or loses something.
- **Thesis quality variance.** If the average thesis is two sentences and "Naspers good," the read-experience is hollow. The 10-character floor in the picks form does not solve this. Either Sharez writes a participant agreement that sets a real bar, or thesis quality becomes the limiting factor on platform reputation. I'd push hard on this before launch.
- **The Sharez social product is still bare** outside Crystal Ball. The cumulative chart isn't built. Stock pages don't surface community theses prominently. If 50,000 spectators land in week 1 and bounce around the platform, what do they actually find on a given user's profile, or on a given stock page? Today: not a lot. The week-1 retention number depends on this not being true at launch.
- **Founding 100 are the lever.** If those 100 aren't credible-feeling investors with their own networks, the 4-invites-each loop produces 400 random people. The launch quality is downstream of the founder cohort. This is a casting decision more than a product decision.

**What I'd sharpen.**

- Ship the cumulative portfolio chart. It's a 1-2 day backend + 1 day frontend job. It transforms profiles from "list of percentages" to "credibility surface."
- Build the stock-page community-theses integration. When a Crystal Ball spectator clicks `Naspers` on a participant's pick, they should land on a stock page that shows: "23 Crystal Ball participants picked Naspers. Here are their theses." That's the thesis primitive doing platform-level work, and it's the shortest path to spectators discovering more participants to follow.
- Get a participant agreement drafted before invite-code distribution. Set the bar on thesis quality, time horizon disclosure, and the no-PSI representation.
- Book the FSCA Innovation Hub conversation now. A 30-minute call costs nothing; receiving a directive later costs everything.

The product is in genuinely good shape architecturally. The launch quality from here is a casting + copy + spectator-loop problem more than a code problem.

---

*For technical context: full task list, decisions log, and architecture state are in the project memory at `~/.claude/projects/-Users-lynettedup/memory/`. Live deploy at https://sharez.onrender.com.*
