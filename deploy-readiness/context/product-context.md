# Product Context — Niche Gap Analyzer

**Product:** Niche Gap Analyzer
**Version under audit:** v0.4 (April 2026)
**Surface:** Single-page Next.js web app deployed on Vercel (niche-gap.vercel.app)
**Owner:** Jason Fields (jasonpfields@googlemail.com)
**Audit context:** Hardening before next manual `vercel --prod` deploy.

---

## What is this product?

Niche Gap Analyzer is an opportunity-discovery tool for indie founders, product strategists, and solo builders. It surfaces validated unmet market needs by combining live signal from Reddit and the Apple App Store with Claude-driven synthesis. The promise to the user: "Find what people want that nobody's built yet."

The primary user is a builder evaluating whether to start (or pivot) a product. They want fast, defensible signal — not generic LLM brainstorming — and a way to compare what they're considering against actual competitive landscape.

## Primary user flows

**Flow A — Zeitgeist scan (top of page, always visible).** User clicks "Scan the Zeitgeist." Claude streams a synthesis across all domains, returning ~10 cross-domain opportunities with scores. User can drill into a domain chip to refine, or click an opportunity to deep-dive in the B2C tab.

**Flow B — B2C niche validation.** User types a niche (or arrives via deep-dive prefill from Zeitgeist). System fetches Reddit pain signals + App Store reviews, then Claude streams a deep analysis with score, evidence, opportunity sizing, and risks. If the user arrived from Zeitgeist, the prior verdict is threaded into the prompt as `priorDiscovery` and Claude must explicitly reconcile any contradictions instead of silently flipping the score.

**Flow C — B2B niche validation.** Same as B2C but routed through professional subreddits / enterprise signals.

**Flow D — Competitive Landscape.** User enters a space + 2–5 named competitors. System fetches App Store data via iTunes Search API (multi-storefront walk + hardcoded ID lookup for known apps like Pausality), then Claude returns a side-by-side analysis. Banner reflects client-side ground truth (which competitors were/weren't found), independent of Claude's confidence score.

**Flow E — Saved.** User can save opportunities to a shortlist for later review and export.

## What "working correctly" means

1. The Zeitgeist verdict and the deep-dive verdict for the same niche must not silently contradict each other. Large deltas must be explicitly reconciled in Claude's prose.
2. Streaming responses must never be silently truncated by SSE chunk-boundary bugs (this was a real production bug fixed in this revision — see fix history).
3. Every named competitor in a Landscape run must appear in the output, with a clear distinction between "not found in any storefront" and "found but thin signal."
4. Pausality (Jason's own app, ID 6743325009, US App Store) must always be discoverable when entered as a competitor — there is a hardcoded ID fallback for this case.
5. The user can always tell whether a banner about missing data reflects client-side ground truth or Claude's subjective confidence. These are not conflated.
6. No deploy may happen via a process other than manual `vercel --prod`. Vercel is intentionally NOT connected to GitHub for this project; git push is backup-only.

## Compliance class

**Class: Simple consumer / non-regulated B2C tool.**

- No user accounts, no auth, no PII collection
- No payment processing
- No health, financial, or biometric data
- All synthesis happens server-side via the user's own deployed Edge function calling Anthropic's API with a server-held key
- Public Reddit and Apple App Store data only — no scraping of restricted endpoints

The only compliance surfaces that apply are: Anthropic's usage policy (no abusive content), Reddit API ToS (rate limits, attribution), Apple's iTunes Search API ToS (no commercial misuse), and basic web hygiene (no leaked secrets, no XSS sinks).

## What changed in this release (v0.4)

- Fixed a critical SSE chunk-buffer bug in `streamClaude` where `decoder.decode(value).split("\n")` was dropping the first half of any line that split across read boundaries. This had been silently truncating long Claude responses for an unknown period.
- Added Zeitgeist↔deep-dive reconciliation: deep-dive synthesis now receives the prior Zeitgeist verdict via `priorDiscovery` and must explicitly call out contradictions.
- Added `KNOWN_APP_IDS` hardcoded fallback (Pausality → 6743325009) so known apps can never be silently dropped from Landscape results.
- Multi-storefront iTunes search walk (us, gb, ca, au, sg, ie, nz) with exact-name matching.
- CompetitiveLandscape banner now reflects client-side ground truth (which competitors had no `appInfo`) instead of conflating with Claude's `dataConfidence`.
- Moved Competitive Landscape from being inlined under both B2C and B2B panels to its own tab (eliminated duplicate render and double loading animations).
- Renamed the Landscape run button from "Map the Landscape" to "Analyze" per user feedback.
- Skepticism calibration added to both Zeitgeist and Discovery prompts ("70+ is rare, large deltas are embarrassing").

## Known deferred / risk items

- **No tests.** Zero unit, integration, or smoke tests in the repo.
- **No error monitoring.** No Sentry, no Vercel Analytics, no observability beyond browser console.
- **Single-file architecture.** `pages/index.js` is ~2440 lines and contains every component, prompt, parser, and helper. No code-splitting.
- **JSON salvage logic for truncated streams** is still present as belt-and-suspenders, even though the SSE bug is fixed — could mask future regressions.
- **Hobby-tier serverless limits.** Edge runtime has ~25s ceiling; long Claude streams can hit it for very large prompts.
- **No rate limiting** on the `/api/claude` proxy route — anyone hitting the public deployment can burn the API key.
- **API key exposure surface.** `ANTHROPIC_API_KEY` is server-side via Edge env, but there's no per-IP or per-session quota.

## Fix history reference

Recent significant fixes (from prior conversation context):
- SSE chunk-boundary truncation bug (root cause of "Unterminated string in JSON" errors).
- Zeitgeist/deep-dive contradiction (e.g. Zeitgeist 65 HIGH → deep-dive 25 LOW for the same niche).
- Pausality silently dropped from Landscape (twice — first hypothesized as iTunes coverage, real cause was prompt wording allowing Claude to drop empty-signal entries).
- Banner conflating "not found" with "found but thin data."
- Two loading animations on landscape run.
- Duplicate "Working…" button label.
