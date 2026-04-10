# Niche Gap — Backlog

Deferred items for future discussion. Ordered roughly by estimated impact / effort
ratio within each section. Mark items with status + date when picked up or shipped.

Last updated: 2026-04-07

---

## Signal fidelity & freshness

These are the "next-tier" fidelity upgrades. The current live stack is
Reddit (relevance + new) + US App Store (paged reviews) + Hacker News Algolia.

### Reddit — deeper pulls
- **Comment threads on top posts.** One extra call per top-5 post to
  `/comments/{id}.json?limit=20&sort=top` to surface qualitative signal that
  post bodies miss. High impact, adds ~5 serial-ish calls per run.
- **Auto-select subreddits from query.** Pre-scan
  `reddit.com/subreddits/search.json?q={query}` and let Claude choose the
  5-8 most relevant subs from the result, so every scan self-targets instead
  of falling back to the hardcoded `defaultSubs` list.
- **Reddit OAuth (script-type app).** Registering a real OAuth app gives us
  100 QPM, proper `after=` pagination, and access to `/r/all` search. Would
  unlock much higher limits and less throttle risk. Requires storing a
  refresh token server-side.
- **Recency-weighted time windows.** Currently `t=year` for relevance +
  `t=month` for new. Consider an adaptive scheme: if month returns <10 hits,
  widen to `year`; if month returns >30, narrow to `week`.

### App Store — multi-storefront & richer metadata
- **Multi-storefront review pull.** Re-introduce the 7-storefront walk
  (`us, gb, ca, au, sg, ie, nz`) — small indie apps often launch in a single
  region before going global, and non-US complaints differ from US ones.
  Currently **restricted to `us` only** for deterministic behavior — see
  `itunesSearchMulti` in `pages/index.js`.
- **`sortby=mosthelpful` in addition to `mostrecent`.** Helpful reviews are
  typically more substantive; merging both feeds gives better low-review
  coverage.
- **Rating distribution tiers.** Use the full `ratings` tier breakdown from
  the lookup response to show distribution, not just the average.
- **Version release notes.** The lookup endpoint returns `releaseNotes` and
  `version` — useful for the "is this app actively maintained?" signal that
  feeds `competitionScore`.

### App Store — indie/niche discovery
- **Domain-seeded `KNOWN_APP_IDS`.** Expand the hardcoded name→trackId map
  so each entry also carries a set of domain keywords (e.g., Pausality:
  `["breathing", "hrv", "biometric", "breathwork", "nervous system"]`). On
  every scan, intersect those keywords against the query; if any match,
  force-include that app alongside whatever iTunes search returns. Solves
  the "themed query doesn't name the app" case that iTunes keyword search
  structurally can't handle — e.g. a search for "biometrics based breathing
  exercises" should still surface Pausality even though its title contains
  none of those words.
- **Genre-peer discovery.** After the primary app is resolved, do a
  secondary iTunes pull for peers in the same `primaryGenreId`
  (`lookup?id=…&entity=software&sort=popular&genreId=…`) so the competitor
  matrix always includes the 3-5 most popular apps in the same App Store
  category, not just whatever matched the exact query keywords. Catches
  category-siblings that keyword search misses.

### New sources
- **Google Play Store.** `google-play-scraper` NPM (server-side) roughly
  doubles mobile competitive signal. Currently we're iOS-only which biases
  everything toward Apple-first product categories.
- **Product Hunt.** Free keyed GraphQL API. Launch date, upvotes, maker
  comments — perfect for `timingScore` grounding and for seeing who *just*
  launched in a space.
- **G2 / Capterra.** Paid review APIs or scrapeable public pages. Critical
  for making B2B mode more than "Reddit + whatever iTunes has" — it's why
  `professionalNicheWarning` fires so often on B2B scans today.
- **YouTube Data API.** Comment sections on "I tried X app" videos are a
  goldmine for unfiltered sentiment. Free tier handles thousands of
  queries/day.
- **Google Trends** (via unofficial trends wrapper). Would give
  `timingScore` a quantitative backbone instead of the LLM's vibe read.
- **TikTok comment search.** Harder (no official API), but where under-25
  demand now lives for consumer niches.
- **Substack / newsletter search.** Good for early-signal on emerging
  categories.

---

## Architecture

- **Per-query cache with TTL.** Key on `(mode, query, sourceSet)` in Vercel
  KV / Upstash Redis (free tier). Re-runs within an hour become near-instant
  and cheap. Today the Reddit proxy has a 5-min edge cache per URL, which is
  per-URL not per-logical-query.
- **Move fan-out server-side.** Currently the browser fans out N fetches; a
  flaky Reddit pull can hold up the whole scan. Server-side parallelism
  inside one function would cut p95 dramatically — but need to either stay
  inside the 25s Edge cap or promote the scan route to a Node serverless
  function with a 60s limit.
- **Decouple fetch from synthesize.** Persist the raw evidence blob after
  the fetch phase so the user can re-run synthesis with a different prompt
  without re-paying for the signal pull.
- **Historical run store.** Persist past scans in the KV above so we can
  show signal drift over time ("demand for GLP-1 side effects scans: ↑ 40%
  in 30 days"). Unique feature no competitor has, falls out naturally once
  we persist runs.

---

## UX / freshness visibility

- **"Last N days only" toggle** in the UI that changes `t=week` / `t=month`
  on Reddit fetches. Users doing trend work explicitly want the stale stuff
  filtered out.
- **Per-source `fetchedAt` stamp + "age of freshest post".** Stamp the
  report with data-age metadata so confidence is visible at a glance.
- **Signal-source chips in the results header.** Small badges showing
  "Reddit 18 · HN 12 · App Store US ·250 reviews" so the user sees the raw
  signal volume per source.

---

## Shipped (kept here for release notes)

### 2026-04-07 (later)
- Multi-app iTunes search: `fetchAppStoreSignals` now fires two parallel
  searches (full query + stopword-stripped keyword version), merges/dedupes
  by `trackId`, and returns up to 5 candidate apps. Primary gets the full
  10-page review pull; the other 4 get a 2-page sample each.
- `appStoreUrl` threaded end-to-end: from iTunes `trackViewUrl`, through
  the synthesis prompt's `AUTO-DETECTED APP CANDIDATES` block, into the
  `competitorMatrix[].appStoreUrl` field, rendered as clickable links in the
  in-app competitor matrix, the auto-detected banner, the markdown export,
  and the HTML/print export.
- B2C synthesis prompt gained a **COMPETITOR MATRIX RULE** instructing
  Claude to include every auto-detected app that is plausibly in-space and
  echo its URL verbatim.

### 2026-04-07
- Reddit `sort=new` parallel pull merged with `sort=relevance`, both piped
  through `fetchRedditCombined`.
- `daysAgo` annotation on every Reddit and HN post, with recency note in
  both B2C and B2B synthesis prompts telling Claude to weight sub-30-day
  posts more heavily.
- US App Store review pagination: `fetchItunesReviewsPaged` walks pages 1-10
  in parallel (~500 reviews) for the main `fetchAppStoreSignals` path, and
  pages 1-5 for named competitor pulls.
- Hacker News Algolia added as a third source (`fetchHackerNewsSignals`).
  Blends `search` (relevance) with `search_by_date` (last 180 days),
  deduped, recency+points sorted, capped at 15 hits, injected into both B2C
  and B2B prompts.
- iTunes lookup + search restricted to `us` storefront only for now.
