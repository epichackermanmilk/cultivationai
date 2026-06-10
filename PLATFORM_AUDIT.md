# NovelCodex — Platform Audit (architecture, RAG, product, cross-service)

_Grounded in this session's direct code/infra inspection. "Fixed ✅" = done & deployed this session. Severity: 🔴 high · 🟠 med · 🟡 low. Effort: XS/S/M/L._

## Executive summary

The platform is healthy at the **feature** level but has **integration drift**: major systems (games, character chat, the knowledge layer) evolved at different times and the recent RAG upgrades (RRF hybrid + cross-encoder reranker + spoiler filter + curated character KB) **only landed in `/api/chat`**. Games and any structured-knowledge features run on the *older, thinner* retrieval. The single biggest strategic gap is that **there is no structured knowledge layer** (characters/events/timeline/relationships/power) beyond 8 hand-curated character profiles — every "smart" query degrades to generic chunk retrieval. The biggest *correctness* risks were cross-service silent failures (Discord roles, token staleness) — **fixed this session**.

**This session's fixes (deployed):** token default 40 (+migration), landing/support accuracy, `/chat` header, `/library` locked catalogue, `ufw` firewall (closed FastAPI:8000 + Next:3000 exposure), Discord silent role-grant failure, token-staleness on focus, atomic token debit RPC.

---

## 20 — Critical user-flow audit (cross-service) — emphasis area

| Flow | Status | Finding |
|---|---|---|
| Signup → tokens | ✅ Fixed | DB default granted 100 (OAuth) not 40; trigger now seeds 40, run `fix_token_default.sql` |
| Discord verify → role | ✅ Fixed | Role grant was fire-and-forget; silent fail when not-in-server / bot-perms. Now awaited + surfaced + status recorded |
| Supabase balance → UI | ✅ Fixed | Frontend loaded `/me` once; now re-syncs on tab focus |
| Concurrent chat → debit | ✅ Fixed | Read-modify-write race; now atomic `debit_tokens()` RPC w/ fallback |
| Purchase → tokens/roles | ✅ Verified strong | Stripe webhook: signature-verified + idempotent; credits + `syncDiscordRoles` |
| Subscription renewal → tokens | 🟠 Verify | Relies on `invoice.payment_succeeded` + `subscription_cycle`; **add a webhook-failure alert** (currently a renewal that fails to credit is invisible) — S |
| Chat → wallet display | 🟠 | Client does optimistic `tokens-10`; server is authoritative. Have `/api/chat` return new balance (header) and set it client-side to prevent drift — S |

## 21 — Discord verification audit
**Root cause (fixed):** `/link/verify` linked the account then fired `syncDiscordRoles` without awaiting; the function returned `void` and bailed silently on 404 (not in server), 403 (missing `MANAGE_ROLES` or NC roles above the bot in hierarchy), or missing token. User saw "verified" regardless.
**Remaining ops checks (you must verify in Discord):** (a) bot has **MANAGE_ROLES**; (b) the bot's highest role sits **above** all NovelCodex roles in Server Settings → Roles (else every PATCH 403s); (c) `DISCORD_BOT_TOKEN` set in prod env. The new code will now report `forbidden` clearly if (a)/(b) are wrong. **Prevention:** `discord_role_status` column logs the last outcome; add a "Resync roles" button surfacing it (resync route already exists).

## 22 — Token synchronization audit
Tokens live in **one** place (Supabase `profiles.tokens`); `/api/auth/me` reads fresh (no cache). The only staleness was the frontend's load-once pattern — **fixed** (focus re-sync). Server-side `/api/novels` etc. caches are unrelated to balance. **Residual:** optimistic post-chat update can drift from the authoritative value (see #20). No Realtime subscription — focus-refresh is sufficient at current scale; consider Supabase Realtime on the profile row later.

## 23 — Data consistency audit
Webhook credits are idempotent (`token_purchases.stripe_reference`) ✅. Verify delete-account purges `conversations`, `user_bookmarks`, and the Resend contact (🟠 confirm — orphaned rows otherwise). Profile updates are single-row, low risk. No multi-step distributed transactions exist (good).

## 24 — State synchronization audit
Frontend `user` state now re-syncs on focus. **In-process rate-limit `Map`** is per pm2 worker — fine at 1 instance, breaks at N (🟠, see scalability). No Redis. No race beyond the (now-fixed) token debit.

## 25 — Observability audit 🔴
Biggest weakness. Today: pm2 logs + uptime monitor + login-lockout email + (new) `discord_role_status`. **Missing:** centralized logs, error tracking (Sentry), alerts on webhook-signature failures / token-burn spikes / 5xx / Discord 403s. A failed renewal or role grant is invisible. **Fix (M):** add Sentry to the Next app, ship pm2 logs to a store, and alert on: webhook failures, anomalous spend, auth 4xx surges.

## 26 — Critical-workflow test plan 🟠
No automated tests exist. **Add** integration tests (Vitest + a Supabase test project) for: signup token grant, atomic debit under concurrency, webhook credit idempotency, Discord sync status branches (mock Discord API), `/api/auth/me` freshness, delete-account cascade. CI gate on PR. Effort M; high regression-prevention value.

---

## 1 — Platform regression audit
- **Schema drift** 🟠: `profiles.sql`, `profiles_v2.sql`, `profiles_complete.sql`, `migration_schema.sql` overlap — unclear source of truth. Consolidate to one ordered migrations dir. (S)
- **Legacy "unlock" concept**: removed in code ("auto-index everywhere") but copy lingered (fixed on /support, landing). Sweep remaining pages (#14). (S)
- **Games on old retrieval** 🟠 (see Part 3).
- **No dead APIs found** in this pass; `/api/novels` (featured) and `/api/novels/all` (full) are both used. `nb-up/down` CSS is legacy-but-harmless.

## 2 — Multi-chat audit
`conversations` table = history per user per novel; rolling `convSummary` + 8-message window for memory. **Isolation:** keyed by user+novel ✅. **Gaps** 🟡: no conversation **search**, no cross-conversation memory, no folders/rename; retrieval quality is identical per chat (good). Fine to ~hundreds of convos/user; add search + titles before that.

## 3 — Game system audit 🟠
Games retrieve **4 chunks/novel via the older path** — **no reranker, no RRF hybrid, no spoiler filter, no character KB, no arc routing**. They were built before the RAG upgrade and never inherited it. **Impact:** trivia/sect-recruitment answers are weaker and less accurate than book chat for the same novel. **Fix (M):** route games through the same retrieval module as `/api/chat` (or extract a shared `retrieve()` lib both call).

## 4 — Novel-specific game experience (choose-a-novel-then-play)
**Strongly recommended now.** With 8 deeply-indexed novels, a "pick Reverend Insanity → play a Gu-master simulator" flow beats generic games on immersion, lore accuracy, and retention. **Advantages:** per-universe immersion, reuses existing chunks + character KB, clear monetization (premium universes). **Disadvantages:** content/QA per novel, lore-accuracy burden, more state. **Ideal impl:** a generic game engine parameterized by a per-novel "universe pack" (factions, power system, key characters from the KB + retrieval); start with the 8 featured. Gated by the structured-knowledge gap (#6/#8) for richest play.

## 5 — RAG audit round 2 (what actually happens today)
`/api/chat`: query → (vector search + keyword search) → **RRF fusion** → **cross-encoder rerank** → spoiler `maxChapter` filter → context assembly → GPT. Routing flags: `isBroad`/`isArc`/`isSummary` switch between chunk retrieval, arc-range scroll, and summary. **Gaps** 🟠: there is **no dedicated retrieval for character / event / timeline / relationship / power-scaling** — those queries use generic chunk retrieval (works, but misses precision). No query **expansion** (synonyms/aliases). Alias handling is implicit (embedding similarity), not a maintained alias map → a driver of remaining hallucinations (#9).

## 6 — Novel-by-novel knowledge audit
All 8 have full chapter chunks. **Structured coverage:** only character profiles, and only where `featured-characters.ts` has entries (≈7–8 chars total, 1/novel). **No** event/timeline/arc/relationship/power data for any novel. **Ranking by depth** (chunks): supreme-magus (13.2k) ≈ against-the-gods (14k) > reverend-insanity (11.7k) > shadow-slave (9.5k) ≈ renegade-immortal (9.2k) > i-shall-seal (8k) > a-will-eternal (5.6k) ≈ warlock (5k). Weakest *structured* = all of them equally (no extraction). **Action:** build a character/event extractor (one pass per novel) — the single highest-leverage knowledge investment.

## 7 — Feature discovery audit
Nav exposes Library/Chat/Characters/Games/Recommend/Bookmarks ✅. **Under-discovered** 🟠: the **spoiler shield** (powerful, buried in chat UI), **multi-novel chat** (homepage mentions it but it's a mode toggle), character chat deep-links. **Fix:** homepage feature strip + first-run tooltips for spoiler shield + multi-novel.

## 8 — Knowledge quality audit
Retrieval is grounded in real chapter text (low hallucination for factual lookups) but **extraction quality is N/A** because there's no extraction pipeline beyond hand-curated characters. **To improve answers on "who/when/relationship/how strong" queries, build extraction** (LLM pass over chapters → characters, aliases, events, power tiers stored as Qdrant payloads or a relational side-table). Reprocessing isn't needed for chunk retrieval; it's needed to *add* structure.

## 9 — Hallucination audit round 2
Remaining sources 🟠: (a) **alias failures** — no alias map, so "Gu Yue Fang Yuan" vs "Fang Yuan" relies on embedding luck; (b) **timeline/event** questions (no event index); (c) **relationship** questions; (d) cross-novel multi-chat blending. **Fixes:** alias dictionary per novel (cheap, high impact), event/timeline extraction, and a stricter "answer only from provided context; say you don't know" guard in the prompt.

## 10 — UX audit
Solid. Friction 🟡: discovery of advanced features (#7); the chat mode/character/spoiler controls are dense; library now ships 4k novels client-side (#11). Reduce: surface strengths on homepage; lazy/paginate the locked catalogue.

## 11 — Performance & scalability audit
- 🟠 **`/api/novels/all` ships ~4,000 records (~1MB) to every library visitor** and filters/searches client-side. Fine at 4k, breaks at 100k. **Fix:** server-side search + pagination (Postgres/Qdrant) before catalogue grows. (M)
- 🟠 **In-process rate limiter** doesn't span workers/instances → move to Cloudflare or Upstash before multi-instance. (M)
- 🟡 Qdrant single `chunks` collection scales to millions of vectors but plan sharding/quantization; embedding **cost** is the real scaling ceiling (the whole reason for curated preview).
- 🟡 `/novels` VPS payload >2MB defeats Next fetch-cache (already worked around with the slim feed).

## 12 — Hidden opportunities (ranked by impact × value, low effort first)
1. **Per-novel "universe" games** (#4) — high retention. 2. **Character extraction → richer character chat for all 8** (M). 3. **Alias maps** (#9) — cheap accuracy win. 4. **Spoiler-shield as a headline feature** + onboarding. 5. **Interactive timeline per novel** (needs event extraction). 6. **Relationship graph explorer.** 7. **Power-scaling explorer** (powerscaling is a known fandom obsession — see reviews). 8. **Faction browser.** 9. **Arc browser / "catch me up to ch N".** 10. **Reading-companion mode** (chapter-by-chapter, spoiler-capped). 11. **Conversation search + titles.** 12. **Multi-novel "who'd win" debate mode** (productize the existing capability). 13. **Shareable answer cards** (Reddit/TikTok growth — reviews show users already do this). 14. **Character-of-the-week spotlight.** 15. **Daily trivia streaks.** 16. **"Explain this chapter" reader plugin.** 17. **Lore-accuracy badges.** 18. **Per-novel onboarding.** 19. **Email digests of new novels (waitlist already built).** 20. **Public character pages for SEO.** 21–30. (faction simulators, alignment quizzes, "which character are you", cultivation-rank calculators, timeline diffs, relationship trivia, novel comparison pages, API for creators, Discord chat-bot bridge, mobile widgets.) — _Detail on request._

## 13 — Red-team architecture review (keep/improve/replace/remove)
- **Supabase auth + service-key API routes:** **Keep.** Standard, works; tighten RLS.
- **Qdrant on the VPS:** **Keep** (cost-efficient); plan managed/sharded at scale.
- **Raw-JSON-on-disk as source of truth + rebuild index:** **Improve** — fine now, but move to a DB/object store with incremental indexing for 100k novels.
- **In-process rate limiter:** **Replace** (Cloudflare/Upstash).
- **Games' bespoke retrieval:** **Replace** with the shared `/api/chat` retrieval.
- **Manual base64-over-SSH deploys:** **Improve** — add CI build gate + a deploy script with health-check/rollback.
- **No structured knowledge layer:** **Add** (the strategic gap).
- **4 overlapping profiles SQL files:** **Replace** with one migrations dir.

## 14 — Content accuracy audit
Fixed this session: landing (stats/covers/claims), `/support` (pricing/curated framing), terminology to "featured". **Still to sweep** 🟠: `/about`, `/shop` (subscription/tier copy vs `checkout.ts` reality), `/characters` (auto-generated wording removed earlier — re-verify), empty/error/loading states, FeedbackWidget labels, any "thousands of novels" or "unlock" remnants outside the pages already fixed. (S–M)

## 15 — Product positioning
Underrepresented strengths 🟠: **source-grounded accuracy**, **spoiler control**, **multi-novel intelligence**, **curated depth**. Current copy leads with generic "ask anything." **Reposition** around "the only spoiler-safe, source-grounded companion for the cultivation epics you actually read."

## 16 — Onboarding audit
Welcome popup explains Browse/Pick/Ask ✅. **Missing** 🟡: no feature tour for spoiler shield, multi-novel, characters, or games; no per-novel first-run; no "what makes this different." Add a dismissible 3-step tour + contextual tips.

## 17 — Terminology standardization
Mostly consistent. Tighten: **Novel** (not "book") everywhere; **Character Chat** (page = "Characters"); **Recommend** (formerly Discover — verify no stragglers); reserve **Game** vs **Simulator** consistently; "tokens" (not "credits"). Publish a one-page glossary.

## 18 — System integration audit
| Integration | State |
|---|---|
| RAG ↔ Chat | ✅ Full (reranker, hybrid, spoiler, character KB) |
| RAG ↔ Games | 🔴 Partial/old (4 chunks, no upgrades) |
| RAG ↔ Character chat | ✅ via chat + featured-characters KB |
| RAG ↔ Timeline/Power/Relationship | ❌ None exist |
| Games ↔ Character/Event/Timeline knowledge | ❌ None |
| Stripe ↔ Tokens ↔ Discord | ✅ Strong (idempotent, role sync) |
| Auth ↔ all routes | ✅ Session-derived user_id |

## 19 — Future readiness
Current architecture **supports**: more novels (cost-bounded), more chat, games. **Blocks** without new work: timeline/relationship/faction/power explorers and rich per-novel simulations — all need a **structured knowledge layer** that doesn't exist yet. **Build now to unlock the roadmap:** (1) a per-novel extraction pipeline (characters, aliases, events, power tiers) writing structured payloads; (2) a shared `retrieve()` module used by chat + games; (3) observability + tests so the above can ship safely.

---

## Prioritized roadmap

**Now (correctness/launch):** ✅ all cross-service fixes done — **run `fix_token_default.sql`** (token default + atomic debit RPC); verify Discord bot perms/hierarchy.
**Short term:** shared `retrieve()` for games (#3/#18); content-accuracy sweep (#14); observability — Sentry + webhook/spend alerts (#25); critical-flow tests (#26).
**Medium term:** **structured knowledge extraction** (#6/#8/#9 — the strategic unlock); server-side library search + pagination (#11); move rate limiting to the edge (#11); per-novel games MVP (#4).
**Long term:** timeline/relationship/power/faction explorers (#12/#19); managed/sharded vectors; CI/CD with rollback (#13).
