# NovelCodex — Analytics tracking

GA4 property `G-RN9SR0DZ6R`, loaded in `app/layout.tsx` behind **Consent Mode v2**
(events only fire after the user accepts the cookie banner). Client events go through
`track(event, params)` in `lib/analytics.ts`; server-side purchases go through
`lib/ga4.ts` (Measurement Protocol). GA4 **Enhanced Measurement** is on, so
`page_view`, scrolls, outbound clicks and site search are captured automatically on
top of the custom events below.

## Custom events

| Event | Where it fires | Params | Answers |
|---|---|---|---|
| `novel_click` | Every novel poster/row (home carousel, trending, popular, latest, browse, similar) | `slug`, `source` | **Which novels get clicked**, and from which surface |
| `nav_click` | Header nav items | `label`, `source` | What people navigate to first |
| `search` | Header search submit | `source`, `length`, `has_query` | How much search is used |
| `signin_click` | Header "Sign in" | `source` | Top-of-funnel intent to register |
| `read_start` | Detail page "Read / Continue" | `slug`, `chapter`, `resumed` | Discovery → reading conversion; resume usage |
| `chapter_read` | Reader, on each chapter open | `slug`, `chapter` | Reading depth / retention per novel |
| `rating_submit` | Detail ratings widget | `slug`, `rating` | Engagement + which novels are loved |
| `comment_post` | Detail comments | `slug` | Community engagement per novel |
| `recommend_run` | /testrecommend search | `mode`, `spoiler_safe`, `results` | AI recommender usage |
| `recommend_click` | Detail "Recommend Similar" | `slug` | Cross-discovery |
| `game_open` | /testgames cards + featured | `id`, `source` | Which games draw interest |
| `chat_message` | Character/Ask-the-Book chat | `mode`, `slug` | Chat usage (curated novels) |
| `avatar_upload` | Profile picture set | — | Profile completion |
| `discord_join_click` | Profile Discord CTA | `location` | Community funnel |
| `sign_up` | Account created (email) | `method` | **New accounts** |
| `login` | Email sign-in success | `method` | Returning users |
| `google_click` | "Continue with Google" | `source` | OAuth funnel |
| `game_start` | A game session begins (prod) | — | Game starts (vs opens) |
| `purchase` | Stripe webhook (server, `lib/ga4.ts`) | `value`, `transaction_id`, `item_id`… | Revenue |

## Key questions → how to read them in GA4

- **Which novels are most clicked** → Reports → Engagement → Events → `novel_click`,
  add `slug` as a secondary dimension (or build an Exploration: dimension `slug`,
  breakdown `source`). Register `slug` and `source` as **custom dimensions** in
  Admin → Custom definitions so they show in reports (event params aren't dimensioned
  until registered — do this once for: `slug`, `source`, `label`, `chapter`, `mode`,
  `rating`, `method`, `id`).
- **What users click first when they land** → Explore → **Path exploration**, start
  point = `session_start` / `page_view` (home), see next step (`nav_click`,
  `novel_click`, `search`).
- **% of visitors who make an account** → Explore → **Funnel exploration**:
  Step 1 `session_start`, Step 2 `sign_up`. The conversion rate is your signup %.
  (Also create a GA4 **Key event** on `sign_up` to track it on dashboards.) For the
  reverse — what content precedes signup — add `read_start`/`novel_click` as an
  intermediate funnel step.
- **Reading funnel** → Funnel: `novel_click` → `read_start` → `chapter_read`
  (count distinct chapters for depth).
- **Monetization readiness** → `chapter_read` volume = ad-impression potential;
  `purchase` = revenue.

## One-time GA4 setup checklist
1. Admin → Custom definitions → register the params above as custom dimensions.
2. Mark `sign_up`, `purchase`, `read_start` as **Key events**.
3. Confirm Enhanced Measurement (page changes via history) is ON for SPA page_views.
4. (Done) `GA4_API_SECRET` set on the VPS for server-side `purchase`.
