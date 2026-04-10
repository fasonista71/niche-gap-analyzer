# App Context — Niche Gap Analyzer (Technical)

## Build & deployment

- **Framework:** Next.js 14.2.3, React 18, no TypeScript.
- **Hosting:** Vercel, Hobby plan.
- **Deploy flow:** Manual `vercel --prod` from local. Vercel is **NOT** connected to GitHub for this project. Git push is backup-only — pushing does NOT trigger a deploy. This is intentional and recorded in user memory.
- **Domain:** niche-gap.vercel.app
- **Region:** Default Vercel Edge regions for the Edge function; default serverless region for the Reddit proxy.
- **Build command:** `next build`
- **Env vars:** `ANTHROPIC_API_KEY` (server-side only, used by Edge function).
- **No CI.** No GitHub Actions, no automated tests on PR, no preview-environment policy.

## Architecture

Single-page Next.js app with two API routes acting as proxies. Practically all UI logic and component code lives in one file.

```
niche-gap/
├── pages/
│   ├── index.js          ← 2441 lines. Every component, prompt, parser, helper.
│   └── api/
│       ├── claude.js     ← Edge runtime proxy → api.anthropic.com/v1/messages
│       └── reddit.js     ← Node runtime proxy → reddit.com JSON
├── styles/               ← Globals only; almost all styling is inline in index.js
├── package.json          ← Three deps total: next, react, react-dom
└── PRIVATE-OPS.md        ← Internal ops notes (deploy flow, etc.)
```

### `pages/index.js` internal structure (line ranges approximate)

| Range | Purpose |
|-------|---------|
| ~1–270 | Color tokens, helpers, `streamClaude` SSE wrapper, JSON salvage logic, iTunes search (`itunesSearchMulti`, `KNOWN_APP_IDS`), Reddit fetch helpers |
| ~270–450 | Prompt builders for landscape, B2C synthesis (with `priorDiscovery` reconciliation), B2B synthesis |
| ~450–1080 | More prompt builders, validators, score calibration |
| ~1080–1450 | Discovery / Zeitgeist prompts and synthesis |
| ~1450–1610 | Export utilities (markdown + HTML print-via-iframe) |
| ~1611–1945 | `CompetitiveLandscapePanel` component (input, fetch orchestration, banners, render) |
| ~1945–2130 | `SavedStatsPanel`, save/note state |
| ~2134–2330 | `ZeitgeistHero` component — top-of-page domain scanner, drill-in chips, deep-dive handoff |
| ~2330–2440 | `Page` (default export): tabs, header, render orchestration |

### Key client-side state

- `b2cPrefill = { niche, priorDiscovery }` — threading from Zeitgeist into B2C deep-dive
- `competitorData[].appInfo` — client-side ground truth for "found vs not found"
- `notFoundNames`, `foreignStorefronts` — captured at fetch time, used for the orange banner independent of Claude's `dataConfidence`
- `activeTab` — `"b2c" | "b2b" | "landscape" | "saved"`

## API integrations

### Anthropic Claude (`/api/claude`)

- **Runtime:** Edge (`export const config = { runtime: "edge" }`).
- **Why Edge:** Hobby serverless functions cap at 10s; Edge gives ~25s of streaming headroom for long synthesis prompts.
- **Auth:** Server-side `ANTHROPIC_API_KEY` from env.
- **Behavior:** Pure passthrough proxy. Body is forwarded as-is to `https://api.anthropic.com/v1/messages`. Response body is streamed straight back to the client (no parsing on the server).
- **Model used by client:** `claude-sonnet-4-20250514` (set in client-side request bodies).
- **Hardening status:** Method check (POST only). Env-var check. JSON-parse guard. Try/catch on upstream fetch. **No rate limiting. No auth. No CORS restriction. No request-size limit. No abuse detection.**

### Reddit (`/api/reddit`)

- **Runtime:** Node (default).
- **Allowlist:** Only `https://www.reddit.com/` and `https://reddit.com/` URLs accepted.
- **Behavior:** Forwards a `?url=` param with browser-style headers (UA spoof, sec-fetch-* headers).
- **Failure mode:** Returns `200 { data: { children: [] }, _error: "..." }` on upstream failure rather than propagating non-200, so the client can render a graceful empty state.
- **Cache:** `s-maxage=300, stale-while-revalidate`.
- **Risk:** UA spoofing of a real Chrome browser to access an API that has its own (rate-limited but legitimate) JSON endpoint. Tolerable for low-volume personal use; would be an attribution / ToS issue at scale.

### iTunes Search API (client-side, no proxy)

- Called directly from the browser to `https://itunes.apple.com/search` and `https://itunes.apple.com/lookup`.
- Multi-storefront walk: us, gb, ca, au, sg, ie, nz.
- `KNOWN_APP_IDS` map provides hardcoded ID lookup as fallback for known apps (e.g. `pausality → 6743325009`).

## Auth model

**There is no auth.** No user accounts, no sessions, no cookies. The site is a public read/write tool — anyone hitting niche-gap.vercel.app can run scans and burn the deployer's `ANTHROPIC_API_KEY`.

## Streaming SSE handling (critical path)

`streamClaude` reads the response body via `getReader()`, decodes with `TextDecoder({ stream: true })`, and maintains a **persistent buffer across chunk boundaries**. Lines are split on `\n`; the last (potentially incomplete) line is held in the buffer for the next iteration. Final flush handles any trailing `data: ` line.

This was rewritten in this revision after the prior naive `decoder.decode(value).split("\n").filter(...)` was found to silently drop the first half of any SSE line that split across reads — manifesting as "Unterminated string in JSON" parse errors at the client.

A JSON salvage layer (`extractJSON`, `salvageJSON`) sits below the parser to recover partial objects from genuinely truncated streams, but with the SSE buffer fix this should rarely trip.

## Known TODOs and deferred work

1. No automated tests of any kind.
2. No error monitoring (Sentry, LogRocket, Vercel Analytics, etc.).
3. `pages/index.js` is a monolith (~2440 lines). No code-splitting; ZeitgeistHero, B2CPanel, B2BPanel, CompetitiveLandscapePanel all live in one bundle.
4. JSON salvage logic is dual-purpose insurance; could mask future regressions.
5. No rate limit on `/api/claude` — public DoS / cost-burn surface.
6. No CORS restriction on `/api/claude` — any origin can call it.
7. `dangerouslySetInnerHTML` should be audited if present (review pending).
8. Inline styles everywhere; no design tokens beyond a `C` constant.

## Monitoring and error tracking

**None.** Errors surface only via:
- Browser console
- The in-app red status row when streaming fails or JSON parse fails
- Vercel's built-in function logs (visible only in the Vercel dashboard)

There is no external alerting, no error budget, no uptime monitor.

## Compliance status

- **Anthropic usage policy:** Compliant — synthesis is for product research, no abusive prompts.
- **Reddit ToS:** Borderline. The Node proxy spoofs a Chrome user agent to access the JSON endpoint. At personal scale this is tolerable; at any meaningful traffic level it would warrant migrating to the official Reddit API with attribution.
- **Apple iTunes Search API ToS:** Compliant for non-commercial discovery use.
- **GDPR / CCPA / HIPAA / PCI:** Not in scope — no PII, no auth, no payments, no health data.

## Recent fix history (relevant to this audit)

- **SSE chunk-buffer fix** in `streamClaude` — root cause of "Unterminated string in JSON" errors, was silently truncating long Claude responses.
- **Zeitgeist↔deep-dive reconciliation** via `priorDiscovery` threading.
- **`KNOWN_APP_IDS` hardcoded fallback** for Pausality and other known apps.
- **Banner ground truth** — `notFoundNames` captured client-side at fetch time, no longer conflated with `dataConfidence`.
- **Landscape moved to its own tab** — eliminated duplicate render that caused two loading animations.
- **"Map the Landscape" → "Analyze"** button label change. (h2 module title "Competitive Landscape Map" was briefly removed and restored.)
