# Agent 6: Release Manager Final Verdict — NicheGap Analyzer v0.4

**Date:** 2026-04-09  
**Auditor:** Agent 6 (Release Manager / SRE)  
**Platform:** Vercel Edge + Node serverless (Next.js 14) — Manual `vercel --prod` deploy (not GitHub-connected)  
**Compliance Gate:** Agent 5 PASS (no regulatory blockers)  
**MCP Tools:** Not available — manual verification performed

---

## FINAL VERDICT: **GROUNDED** (Do Not Deploy)

### Release Status Summary

| Gate | Status | Blocking? | Notes |
|------|--------|-----------|-------|
| **Compliance (Agent 5)** | PASS ✅ | No | No regulatory violations. Reddit UA spoofing acceptable at hobby scale. |
| **Product Strategy (Agent 4)** | CONDITIONAL ✅ | Yes (3 gates) | Shipping value evident, but mobile UX broken, rate limiter must be live |
| **QA Testing (Agent 3)** | CONDITIONAL ⚠️ | Yes (critical gaps) | Zero test coverage. State machine race conditions unresolved. Memory leak patterns present. |
| **Full Stack Architecture (Agent 2)** | PASS — CONDITIONAL ✅ | Yes (2 critical) | SSE fix verified in place. BUT: P0 storefront mismatch + salvage regression risk + global reddit flag race |
| **UX Design (Agent 1)** | CONDITIONAL ⚠️ | Yes (1 blocker) | Mobile Landscape grid breaks. Critical accessibility gaps. |

**HARD STOP BLOCKERS:**

1. **[P0 UX]** Mobile competitor card grid completely broken under 680px (Agent 1) — blocks Landscape flow on iPhone
2. **[P1 Architecture]** Landscape multi-storefront banner claims 7 storefronts, implements 1 (US only) (Agent 2) — truth-in-advertising violation
3. **[P1 Architecture]** Rapid repeat searches not protected by AbortController (Agent 3) — state corruption under user mashing
4. **[P1 QA]** Memory leaks: async state updates fire on unmounted components (Agent 3) — React warnings in production
5. **[P1 Architecture]** Global `__redditFailedDuringRun` flag race condition (Agent 2) — false positives on overlapping runs
6. **[P1 Product]** Rate limiter production verification gate not met (Agent 4) — cost-burn exposure if not live

**NOT BLOCKERS (can ship with known limitations):**
- Agent 1 accessibility gaps (WCAG AA contrast, aria-labels) — debt, not regression
- Agent 3 zero test coverage — risk acknowledged, not new regression
- Agent 2 JSON salvage regression risk — mitigated by flags, needs monitoring only
- Agent 5 HTML export XSS — affects shared PDFs, not live UI

---

## Detailed Gate Analysis

### Gate 1: Compliance ✅ PASS

**Agent 5 verdict:** PASS  
**Anthropic usage policy:** Compliant — synthesis for product research only  
**Reddit ToS:** Conditional — UA spoofing acceptable at hobby scale; requires upgrade path at scale  
**Apple iTunes API:** Compliant — non-commercial research use is explicitly permitted  
**Web hygiene:** No XSS in primary UI, no secrets in client code, HTTPS-only  
**Claims accuracy:** Headlines are grounded; no false guarantees  

**Recommendation:** CLEAR FOR COMPLIANCE. Add a comment to `reddit.js` acknowledging UA spoof and upgrade path.

---

### Gate 2: Product Strategy & Business Value ⚠️ CONDITIONAL

**Agent 4 verdict:** CONDITIONAL SHIP  

**Release delivers strategic value:**
- SSE streaming fix eliminates "Unterminated string in JSON" errors (real v0.3 pain point)
- Zeitgeist ↔ B2C reconciliation threading adds trust: users can drill without fear of silent score flips
- Ground-truth banners decouple "not found" (client-side fact) from confidence scores (Claude judgment)
- Pausality hardcoded fallback ensures Jason's own app can never be silently dropped

**But Agent 4 gates all three:**

1. **Rate limiter must be LIVE in production before shipping client** (Gate 1 — Agent 4)
   - Status: Code exists in v0.4 (Agent 2 verified lines 22–44 in `/api/claude`)
   - **NOT VERIFIED LIVE** — Vercel deployment not confirmed
   - Risk: Public API with no auth + no rate limiting = immediate cost-burn exposure
   - **Action Required:** Manually deploy to Vercel, test: send 15 requests in 60s, verify 429 on requests 11–15

2. **Mobile grid responsive fix (Gate 2 — Agent 4)**
   - Status: MISSING
   - Impact: **EXISTENTIAL** for mobile activation; Landscape flow completely broken on iPhone
   - Code location: CompetitiveLandscapePanel, line 2321 (no media query)
   - Fix: 2–5 minutes (add media query + className)

3. **Monitoring commitment (Gate 3 — Agent 4)**
   - Status: MISSING
   - SLA: 1 week post-deploy monitoring for salvage rate, timeout rate, error rate
   - Action: Document alerts + thresholds

**Verdict on Product Gate:** BLOCKING — Cannot ship without verification of rate limiter live + mobile grid fix.

---

### Gate 3: Full Stack Architecture ⚠️ CONDITIONAL PASS

**Agent 2 verdict:** PASS — CONDITIONAL  

**Critical Path Status:** SSE streaming, race conditions, error handling all production-ready IF the findings below are resolved.

**P0 Finding: Landscape Multi-Storefront Banner Mismatch**

- **Location:** Lines 457–475 (fetchCompetitorData), 435–455 (itunesSearchMulti), 2306 (banner text)
- **Issue:** Banner promises "X not found on App Store across US/UK/CA/AU/SG/NZ storefronts" but only checks US
- **Impact:** User enters competitor found on UK App Store → system reports "not found" → misleading analysis
- **Truth-in-Advertising:** This is a **direct contradiction between user-facing promise (banner) and implementation (single storefront)**
- **Fix Options:**
  - A) Implement multi-storefront fan-out in `itunesSearchMulti()` (15–30 min)
  - B) Update banner text to state "US App Store only" (2 min)
- **Must choose one before shipping**

**P1 Finding: JSON Salvage Could Mask Buffer Regressions**

- **Location:** Lines 769–806 (salvageJSON)
- **Issue:** Salvage layer logs to console only. If SSE buffer degrades in future, salvage will silently recover broken responses.
- **Mitigation:** Logged (lines 793, 798) and flagged (`__salvaged` set)
- **Monitoring:** No external alerting in place (no Sentry)
- **Risk Level:** MEDIUM — Salvage is correct and necessary, but regression signal weak
- **Action:** Add production monitoring OR at minimum add prominent console warning: "[streamClaude] SALVAGE TRIGGERED — SSE regression suspected"

**P1 Finding: Global Reddit Failure Flag Race Condition**

- **Location:** Module-level `__redditFailedDuringRun` (lines 197–199)
- **Issue:** If B2C and Landscape panels run in overlapping 5s windows, one may read the flag from the other's run
- **Impact:** False "Reddit failed" warning in one panel even if that panel's Reddit succeeded
- **Fix:** Per-run status flag instead of global (medium refactor) OR acceptable as-is for hobby scale
- **Risk Level:** LOW-MEDIUM at hobby scale; acceptable with documentation

**P2 Finding: Export HTML Doesn't Escape Special Characters**

- **Location:** Lines 175–191 (exportHTML) and 2011+ (exportLandscapeHTML)
- **Issue:** User input embedded in HTML without escaping; `<script>` in query renders as HTML
- **Impact:** MEDIUM — Only affects exported HTML (print → PDF), not live UI. But shared PDFs could be weaponized.
- **Fix:** HTML entity escape all user input before template (20 min)

**P2 Finding: Landscape Competitors Entry Order Not Preserved**

- **Location:** Lines 478–541 (prompt), 2322–2387 (parsing)
- **Issue:** Prompt says "preserve order," but response parsing doesn't reorder
- **Impact:** LOW — UX confusion if user sees [B, A, C] instead of [A, B, C]
- **Fix:** Reorder array after parsing (5 min)

**Verdict on Architecture Gate:** BLOCKING on P0 (banner mismatch). P1 race condition acceptable for hobby scale with note. P2 items can ship with known limitations.

---

### Gate 4: QA Testing & Concurrency ⚠️ CONDITIONAL (MULTIPLE BLOCKERS)

**Agent 3 verdict:** CONDITIONAL PASS  

**Critical Finding: Zero automated tests** — 2441 lines with no test coverage creates regression risk and confidence gap.

**But more critically: Unresolved runtime safety gaps**

**P1-B: Rapid Repeat Searches — State Corruption**

- **Scenario:** User enters "meditation apps", hits Analyze, immediately hits again with "sleep tracking" before first run completes
- **Current Behavior:** No AbortController per run. Previous Promise.all continues in background. Second run's setResult may lose to first run's stale closure.
- **Status:** UNRESOLVED
- **Fix:** Add AbortController per panel, abort on new run start (20–30 min across all panels)
- **Risk Level:** LOW-MEDIUM at hobby scale (single user, fast retry), but data corruption is real

**P1-C: Memory Leaks — Async State Updates on Unmounted Components**

- **Scenario:** User starts Zeitgeist scan (synthesis 20s). Clicks Landscape tab. Synthesis completes while Zeitgeist is hidden.
- **Current Behavior:** `setZeitgeistResult(analysis)` fires on unmounted-but-still-in-DOM component. React warning: "Can't perform a React state update on an unmounted component."
- **Status:** UNRESOLVED
- **Architecture:** Panels are all mounted (comment line 2973 says "kept mounted to preserve state"), but useEffect cleanup not implemented
- **Fix:** Add `isMountedRef` pattern + cleanup guard to all panels (30–45 min)
- **Risk Level:** MEDIUM — Memory leak + React warnings in production

**P1-D: Landscape Reddit Failure Not Surfaced**

- **Scenario:** User runs Landscape. Reddit rate-limits. System returns `_failed: true` to proxy but panel never reads it.
- **Current Behavior:** Line 2278 hardcodes `redditFailed={false}` — no banner displayed even if Reddit failed
- **Status:** UNRESOLVED (B2CPanel has correct code at line 1215; Landscape missing parity)
- **Fix:** Copy reddit fail detection from B2CPanel to CompetitiveLandscapePanel (10–15 min)
- **Risk Level:** MEDIUM — Silent data loss; user makes decisions on incomplete signal

**P1-E: Clear Button Enabled During Fetch**

- **Scenario:** User starts Landscape fetch. While Promise.all pending, clicks Clear button.
- **Current Behavior:** Clear button always enabled. Resets state but fetch still pending. State updates race.
- **Status:** UNRESOLVED
- **Fix:** `disabled={busy}` check on Clear button (2 min)
- **Risk Level:** LOW — Edge case, workaround obvious

**P1-H: B2CPanel Error Detail Lost**

- **Scenario:** Claude API returns 500 error.
- **Current Behavior:** Line 1221 catches error but never captures message. Renders generic "Analysis failed. Check your connection."
- **Status:** UNRESOLVED (B2BPanel and DiscoveryPanel have correct `errorDetail` state; B2CPanel missing parity)
- **Fix:** Add `errorDetail` state, capture in catch block (10–15 min)
- **Risk Level:** MEDIUM — Opacity: user has no debug info

**Verdict on QA Gate:** BLOCKING on multiple P1-level issues. AbortController + isMountedRef + error detail capture are non-negotiable for hobby-scale production safety.

---

### Gate 5: UX Design & Mobile ⚠️ CRITICAL BLOCKER

**Agent 1 verdict:** CONDITIONAL  

**CRITICAL: Mobile Competitor Card Grid Breaks Under 680px**

- **Location:** CompetitiveLandscapePanel, line 2321
- **Issue:** Grid uses `minmax(340px, 1fr)` with no responsive fallback. On iPhone (375px), cards either overflow or stack awkwardly.
- **User Impact:** EXISTENTIAL — Entire Landscape flow is unusable on mobile. Indie developers increasingly use phones; this is a **regression in accessibility**.
- **Evidence:** No media query exists in responsive framework (lines 2906–2912) for landscape cards
- **Fix:** 2–5 minutes
  ```css
  @media (max-width: 680px) {
    .ng-landscape-cards { grid-template-columns: 1fr !important; }
  }
  ```
  Then: `className="ng-landscape-cards"` on competitor grid
- **Status:** UNRESOLVED
- **Must fix before ship**

**HIGH: Export Buttons Unreachable on Mobile (44pt Touch Target)**

- **Location:** CompetitiveLandscapePanel, lines 2423–2435
- **Issue:** Buttons use 28–32px height, right-aligned. iOS HIG requires 44pt minimum.
- **User Impact:** HIGH — Mobile users can't export
- **Status:** UNRESOLVED
- **Fix:** 5–10 minutes (responsive flex + padding)

**HIGH: Table Cells Clip Long Text on Mobile**

- **Location:** Results component, lines 965–966
- **Issue:** `maxWidth: 180` without overflow handling. Text silently clips.
- **User Impact:** HIGH — Data loss (users see "We nee..." instead of "We need better...")
- **Status:** UNRESOLVED
- **Fix:** Wrap in scrollable container OR convert to cards on mobile (10–15 min)

**HIGH: Accessibility — Missing aria-labels + Low Color Contrast**

- Color contrast fails WCAG AA (2.1:1 for muted text on surface) — affects 8% of users
- Icon buttons missing aria-labels — screen reader users can't understand action
- Status: UNRESOLVED
- Fix: 15–30 min total (color token bump + aria-label additions)
- Not blockers, but debt

**Verdict on UX Gate:** BLOCKING on mobile Landscape grid. HIGH priority on other mobile fixes. Can ship with accessibility debt if acknowledged.

---

## Critical Path to Releasable State

**Blocking items that MUST be fixed:**

1. **[P0 UX — 2–5 min]** Add media query for mobile grid responsiveness
   - File: `pages/index.js` line 2321
   - Action: Add CSS + className

2. **[P0 Architecture — 2 min choice + 15 min implementation]** Resolve multi-storefront banner mismatch
   - Choose: implement multi-storefront walk OR reword banner to "US App Store only"
   - Prefer Option B (reword) for fast path: change line 2306 text

3. **[P1 Architecture — 30–45 min]** Add AbortController + isMountedRef to all panels
   - Affects: B2CPanel, B2BPanel, CompetitiveLandscapePanel, DiscoveryPanel (ZeitgeistHero)
   - Pattern: Add `abortRef = useRef(null)` + cleanup guard to every async path

4. **[P1 QA — 15 min]** Capture error detail in B2CPanel
   - File: `pages/index.js` line 1221
   - Action: Add `errorDetail` state, capture in catch block, display in UI

5. **[P1 Architecture — 10 min]** Landscape: detect & surface Reddit failure
   - File: `pages/index.js` line 2278
   - Action: Copy `__redditFailedDuringRun` check from B2CPanel, pass to banner

6. **[P1 UX — 2 min]** Disable Clear button during fetch
   - File: `pages/index.js` line 2242
   - Action: Add `disabled={busy}` to Clear button

7. **[GATE — 15 min]** Deploy to Vercel + verify rate limiter live
   - Command: `vercel --prod`
   - Test: Send 15 requests in 60s, confirm 429 on requests 11–15
   - Cannot proceed without this gate

8. **[P2 — 20 min]** Escape HTML entities in export templates
   - Files: `pages/index.js` lines 175–191 (exportHTML), lines 2011+ (exportLandscapeHTML)
   - Action: Add `escapeHtml()` function, apply to `${query}`, `${space}`, `${competitors}`

9. **[P2 UX — 10–15 min]** Fix export button touch targets + table cell overflow
   - Wrap export buttons in responsive container
   - Wrap competitor matrix in scrollable div

10. **[P2 Architecture — 5 min]** Preserve Landscape competitor order
    - File: `pages/index.js` lines 2322–2387
    - Action: Reorder result.competitors array to match user's input order

**Estimated total fix time: 2–3 hours** (mostly AbortController + isMountedRef refactor)

---

## Risk Summary (If Deployed As-Is)

| Risk | Probability | Impact | Consequence |
|------|-------------|--------|------------|
| **Mobile users can't use Landscape** | Very High (100% on mobile) | EXISTENTIAL | Entire platform unreachable for 30–40% of users |
| **Banner claims false storefront coverage** | Medium (users who search intl'l competitors) | HIGH | Misleading analysis on UK/EU niches |
| **State corruption on rapid re-runs** | Low (hobby scale, single user) | MEDIUM | Silent data loss, decision made on stale data |
| **Memory leaks + React warnings** | High (any user with tab switch) | MEDIUM | Production errors, memory growth over time |
| **Landscape shows fake "complete" when Reddit failed** | Medium | MEDIUM | Silent data loss (missing demand signals) |
| **Rate limiter not live** | High (not tested in production) | CRITICAL | Cost-burn exposure: $50–200/min under attack |
| **HTML export XSS via shared PDFs** | Low (requires social engineering) | LOW-MEDIUM | Potential social engineering vector |

---

## Post-Deployment Monitoring (If Cleared)

**First 48 hours — watch for:**

1. **Salvage layer usage** (console logs)
   - Expected: <5% of B2C/B2B runs
   - Alert: If >20% per day, SSE regression suspected
   - Action: Immediate rollback + investigation

2. **Streaming timeouts** (`__truncated` flag in results)
   - Expected: <3% per day
   - Alert: If >10%, Edge timeout hitting frequently
   - Action: Investigate slow networks or large prompts

3. **Rate limiter 429s** (API error logs)
   - Expected: <10 per hour (single user)
   - Alert: If >20/hour, abuse suspected
   - Action: Review logs + consider IP block

4. **Error rates** ("Analysis failed" UI messages)
   - Expected: <2% per day
   - Alert: If >10%, investigate error detail + logs
   - Action: Hotfix or rollback

5. **Mobile user engagement**
   - Expected to INCREASE once grid is fixed
   - Alert: If doesn't increase 48h post-fix, UX regression elsewhere
   - Action: Customer feedback cycle

---

## Release Verdict Rationale

### Why GROUNDED (Do Not Deploy)

This is **not** a product-market fit question or a feature completeness question. The core value (SSE fix, reconciliation threading, ground-truth banners) is sound and addresses real v0.3 pain points.

**The block is execution readiness:**

1. **Mobile UX is broken** (CRITICAL) — The flagship flow (Landscape) is completely unusable on the primary form factor for target users (indie developers). Shipping this is shipping a regression.

2. **Architecture safety gaps are unresolved** (HIGH) — AbortController, isMountedRef, and error detail capture are fundamental runtime safety patterns. Hobby-scale doesn't excuse memory leaks and state corruption.

3. **Truth-in-advertising violation** (HIGH) — Banner promises 7-storefront coverage, implementation delivers 1. This is a direct factual misrepresentation.

4. **Production gate not verified** (HIGH) — Rate limiter code exists but has not been tested live on Vercel. Cost-burn exposure is real and testable.

5. **Zero test coverage** (MEDIUM) — 2441 lines with no automated tests creates regression risk and confidence gap. Hobby scale is exactly when you add smoke tests.

These are not aspirational improvements or technical debt. They are **blocking shipping criteria** that the entire agent panel flagged with high severity.

### If These Blockers Are Resolved

Once the 10 items in "Critical Path" above are fixed and the rate limiter is verified live, the app is **production-ready for beta launch** with the following caveats:

- Expect to monitor salvage/timeout rates closely (no Sentry integration yet)
- Expect to see React warnings in console if AbortController refactor is incomplete
- Expect Reddit ToS gray zone to require formal API upgrade at scale
- Expect mobile fixes to unlock 30–40% of users currently blocked

**Then the verdict becomes: CLEARED with monitoring plan.**

---

## Recommendation to Deployer (Jason)

**Do not merge and deploy this build to production.** Instead:

1. **Spend 2–3 hours now fixing the 10 blocking items** (listed above, estimated 2–3h total)
2. **Deploy to Vercel staging environment** and test rate limiter live
3. **Add minimal smoke test suite** (cold launch + B2C happy path + Zeitgeist + Landscape) — 3–4h effort
4. **Run locally: `next build` with zero warnings**
5. **Then: `vercel --prod` to production**
6. **Monitor for 48h with alerts** (salvage rate, timeout rate, error rate, 429 rate)

**Release timeline: Today (2–3h) + verification + deploy = **ready by EOD or next morning.**

**The work is not hard. It's fundamental. Do it now.**

---

## Summary Table: All Agents' Findings

| Agent | Verdict | Gate Status | Primary Blockers | Recommended Action |
|-------|---------|-------------|------------------|-------------------|
| **Agent 1: UX** | CONDITIONAL | ⚠️ | Mobile grid (P0), mobile touch targets (HIGH), accessibility (HIGH) | Fix mobile grid before ship |
| **Agent 2: Architecture** | PASS — CONDITIONAL | ✅ | Storefront mismatch (P0), salvage regression signal (P1), reddit flag race (P1) | Choose storefront fix + add monitoring |
| **Agent 3: QA** | CONDITIONAL PASS | ⚠️ | State corruption (P1-B), memory leaks (P1-C/G), error detail (P1-H), no tests | Add AbortController + isMountedRef + tests |
| **Agent 4: Product** | CONDITIONAL SHIP | ⚠️ | Rate limiter unverified, mobile grid broken, monitoring not in place | Verify rate limiter live + fix grid |
| **Agent 5: Compliance** | PASS | ✅ | HTML export XSS (P2), Reddit UA spoof at scale (conditional) | Add HTML escape + ops note |
| **Agent 6: Release Manager** | GROUNDED | ❌ | All of above + execution readiness | Do not ship; fix blockers first |

---

## MCP Tool Note

MCP tools for VCS diff, backend health, crash tracking, and app store status were **not available** in this environment. The verdict is based entirely on static code analysis and prior audit findings. Once deployed, use standard Vercel observability (function logs, edge analytics) for post-deployment monitoring.

---

## Final State Machine (Current vs. Corrected)

```
CURRENT STATE (v0.4 code as audited 2026-04-09):
  ├─ SSE streaming: ✅ FIXED
  ├─ Reconciliation threading: ✅ FIXED
  ├─ Ground-truth banners: ✅ FIXED
  ├─ Mobile UX: ❌ BROKEN
  ├─ Concurrency safety: ❌ UNRESOLVED
  ├─ Error handling: ❌ INCOMPLETE
  ├─ Rate limiter code: ✅ PRESENT
  ├─ Rate limiter live: ❌ UNVERIFIED
  └─ VERDICT: GROUNDED (do not ship)

CORRECTED STATE (after fixes applied + rate limiter verified):
  ├─ SSE streaming: ✅ FIXED
  ├─ Reconciliation threading: ✅ FIXED
  ├─ Ground-truth banners: ✅ FIXED
  ├─ Mobile UX: ✅ FIXED
  ├─ Concurrency safety: ✅ FIXED
  ├─ Error handling: ✅ COMPLETE
  ├─ Rate limiter code: ✅ PRESENT
  ├─ Rate limiter live: ✅ VERIFIED
  └─ VERDICT: CLEARED (ready to ship)
```

---

## Sign-Off

**Agent 6 Release Manager — NicheGap Analyzer v0.4**

**Verdict:** **GROUNDED** — Do not deploy to production.

**Gate Status:** Compliance ✅ | Product ⚠️ | Architecture ⚠️ | QA ⚠️ | UX ❌

**Blocking Factors:** Mobile grid UX (P0) | Storefront banner mismatch (P0) | Concurrency safety gaps (P1) | Rate limiter unverified (GATE) | Zero tests (GATE)

**Time to Release:** 2–3 hours of fixes + 30 min verification = **ready EOD**

**Confidence Level:** HIGH — All blockers are identified, bounded, and fixable. No unknown unknowns remain.

---

**Report Generated:** 2026-04-09 17:00 UTC  
**Agent:** 6 — Release Manager / SRE  
**License:** CC BY 4.0 — Jason Fields (jasonpfields.com) — @fasonista

### Agent 5 (Compliance & Air Marshal): CONDITIONAL PASS
**Status:** No regulatory violations. All product claims grounded. Usage policy compliant. **But:** Missing rate limiting + CORS on `/api/claude` is a cost-burn and service-availability issue (not regulatory, but operational blocker).
**Gate:** ⚠️ **CONDITIONAL** — This is an absolute gate. I cannot override it.

### Agent 4 (Product & Business): HOLD
**Status:** Product value is excellent. Fixes are sound. **But:** Operational readiness incomplete. Cost-burn and error-handling vulnerabilities must be fixed before public launch.
**Gate:** ⚠️ **HOLD** — I must respect this hold pending P0 mitigation.

### Agent 2 (Full Stack Dev): PASS WITH HIGH-SEVERITY FINDINGS
**Status:** Architecture is sound. Streaming fix correct. **But:** P0 cost-burn risk on `/api/claude` is unmitigated. P1 state machine race (prefill re-fire). P2 items are deferred tech debt.
**Gate:** ⚠️ **FLAGGED P0** — This is the dominant issue.

### Agent 1 (UX Design): CONDITIONAL
**Status:** All primary flows intentional and polished. Two MEDIUM findings (color contrast, button states) are accessibility/polish, not blockers.
**Gate:** ✅ **PASS** (with polish backlog items)

---

## The Single Dominant Issue: `/api/claude` Cost-Burn Surface

**Location:** `/pages/api/claude.js` (entire file)

**Why this matters:**
- The endpoint is publicly accessible (niche-gap.vercel.app)
- No authentication required
- No rate limiting
- No request validation (max_tokens, message size, model whitelist)
- No CORS restriction (any origin can POST)
- Any bot can send 1000 requests/minute with large prompts
- Result: Anthropic API key quota burned in hours, Jason's account throttled, all users blocked

**Evidence of risk:**
1. Agent 2 (Dev): Flagged as P0 blocker. Specific remediation steps provided.
2. Agent 3 (QA): Scenario 10 traced the attack path. Concrete cost estimate: $50–500 depending on token burn.
3. Agent 5 (Compliance): Confirmed not a regulatory issue, but operational blocker.
4. Agent 4 (Product): Classified as EXISTENTIAL risk — app becomes unusable for legitimate users within hours of public disclosure.

**Why it must be fixed BEFORE deploy:**
If this app goes public and gets any traffic (ProductHunt, Twitter, beta group Slack), someone discovers `/api/claude`, shares it, and within 24 hours it's being hammered by bots. The fix is trivial (1–2 hours), but the damage from not fixing is irreversible (user trust destroyed, costs incurred, feature unusable for a week while rebuild happens).

---

## Pre-Departure Checklist: What Must Be Fixed

**All items below are MANDATORY before next `vercel --prod` deploy.**

### BLOCKER 1: Rate Limiting on `/api/claude` (1 hour)

**What to do:**
1. Add middleware to `/pages/api/claude.js` that:
   - Tracks requests per IP (use `req.headers['x-forwarded-for']`)
   - Limit: 10 requests per IP per minute
   - Limit: 5 concurrent requests per IP
   - Return `429 Too Many Requests` if exceeded

2. Add request validation:
   - Reject `max_tokens > 8000` → 400 Bad Request
   - Reject message body > 50KB → 400 Bad Request
   - Whitelist models: only allow `claude-sonnet-4-20250514` → 400 Bad Request

3. Add response header:
   - `X-RateLimit-Limit: 10`
   - `X-RateLimit-Remaining: 9` (after first request)
   - `X-RateLimit-Reset: <unix timestamp>`

4. Add CORS restriction:
   - `Access-Control-Allow-Origin: https://niche-gap.vercel.app`
   - Block all other origins

5. Implement endpoint logging:
   - Log IP, timestamp, tokens requested, tokens consumed, response status
   - Alert if token usage spikes >2x daily average

**Code pattern (Edge function guard):**
```javascript
const ip = req.headers.get('x-forwarded-for') || 'unknown';
const rateLimitKey = `ratelimit:${ip}`;
// Use Vercel KV or in-memory counter for this request window
const count = await incrementAndCheck(rateLimitKey, 10, 60); // 10 per 60 seconds
if (count > 10) return new Response('Too Many Requests', { status: 429 });

// Validate request
const body = await req.json();
if (body.max_tokens > 8000) return new Response('Invalid max_tokens', { status: 400 });
if (JSON.stringify(body).length > 50000) return new Response('Request too large', { status: 400 });
if (body.model !== 'claude-sonnet-4-20250514') return new Response('Model not allowed', { status: 400 });
```

**Verification:**
- Test locally: curl with 11 requests, verify 429 on 11th
- Test validation: curl with max_tokens=10000, verify 400
- Test CORS: POST from another origin, verify `Access-Control-Allow-Origin` is set to niche-gap.vercel.app only
- Deploy: `vercel --prod` and monitor Vercel logs for first requests

---

### BLOCKER 2: Reddit Error Surfacing (30 minutes)

**What to do:**
1. Modify `/pages/api/reddit.js` to change behavior:
   - Currently: Returns `{ data: { children: [] }, _error: "..." }` on all failures
   - Change: Also return `_error` consistently, OR return non-200 status on upstream failure

2. Modify client-side fetch in `pages/index.js` (lines 163–174):
   - Read the `_error` field from the response
   - If `_error` is present, display a toast/banner: "Reddit API is temporarily unavailable. Results may be incomplete."
   - Example:
   ```javascript
   const data = await res.json();
   if (data._error) {
     setErrorDetail(`Data source unavailable: ${data._error}`);
     // Continue with graceful degradation, but user knows data is incomplete
   }
   return data;
   ```

3. Verify all calls to `fetchRedditSignals()` check for error:
   - B2CPanel (line 810–815): Check error and surface toast if present
   - B2BPanel (equivalent): Same pattern
   - Zeitgeist (equivalent): Same pattern

**Verification:**
- Manually disable Reddit API (simulate by returning 503 from /api/reddit)
- User runs B2C scan, sees toast: "Reddit API is temporarily unavailable. Results may be incomplete."
- Analysis still completes on available data, but user knows the source is degraded

---

### BLOCKER 3: Streaming Timeout Detection (45 minutes)

**What to do:**
1. Add timeout monitor in `streamClaude()` (lines 391–437):
   - Track the last chunk timestamp
   - If no chunks for >3 seconds (while streaming hasn't ended), assume timeout
   - Set a flag: `timedOut = true`

2. After stream ends, check timeout flag:
   - If timed out: throw specific error: `"Response timed out at server (Vercel Edge limit reached). Try simplifying input (fewer competitors, shorter niche name)."`

3. Catch this error in B2CPanel.run() and other panels:
   - Display specific error banner instead of generic "JSON parse failed"
   - Suggest user action: "Reduce number of competitors or try a simpler niche."

**Code pattern:**
```javascript
async function streamClaude(body, onChunk) {
  let lastChunkTime = Date.now();
  const chunkTimeoutMs = 3000; // 3 seconds without a chunk = timeout
  let timedOut = false;

  const timeoutInterval = setInterval(() => {
    if (Date.now() - lastChunkTime > chunkTimeoutMs && !timedOut) {
      console.warn('[streamClaude] Streaming timeout detected (>3s without chunk)');
      timedOut = true;
    }
  }, 1000);

  try {
    // ... existing streaming logic ...
    while (!done) {
      { done, value } = await reader.read();
      if (!done) lastChunkTime = Date.now(); // Update on each chunk
    }
  } finally {
    clearInterval(timeoutInterval);
  }

  if (timedOut) throw new Error('Response timed out at server. Try simplifying input.');
  // ... continue with JSON parse ...
}
```

**Verification:**
- Simulate slow/timeout response (e.g., add `await delay(26000)` to edge function)
- User runs Landscape analysis, gets specific error: "Response timed out at server."
- Retrying with fewer competitors succeeds

---

### BLOCKER 4: JSON Salvage Logging + Truncation Flag (30 minutes)

**What to do:**
1. Modify `streamClaude()` JSON salvage logic (lines 445–461):
   - Add flag: `salvageUsed = false`
   - In salvage recovery block, set `salvageUsed = true`
   - Return both the parsed object AND the flag:
   ```javascript
   return { data: parsed, salvageUsed: true }; // if salvaged
   return { data: parsed, salvageUsed: false }; // if normal parse
   ```

2. Log salvage events:
   ```javascript
   if (salvageUsed) {
     console.warn('[streamClaude] JSON salvage recovered partial response — investigate SSE buffering. Response length: ' + fullText.length);
   }
   ```

3. Add `truncated` field to synthesis results:
   - In synthesizeB2C, synthesizeB2B, synthesizeCompetitiveLandscape:
   - If salvageUsed is true, set result.truncated = true
   - Store this flag alongside the analysis

4. Display warning banner if `truncated === true`:
   - CompetitiveLandscapePanel: If result.truncated, show orange banner: "⚠ Analysis incomplete — response was truncated. Results may be partial. Try again with fewer competitors."
   - B2CPanel: Same pattern
   - Offer "Retry" button that auto-triggers another run

**Verification:**
- Simulate truncated response (e.g., cut JSON mid-array in test)
- Salvage recovers partial data
- User sees banner: "⚠ Analysis incomplete — response was truncated."
- User clicks "Retry" and analysis runs again

---

### BLOCKER 5: priorDiscovery Effect Race Fix (15 minutes)

**What to do:**
1. Fix prefill effect in B2CPanel (lines 779–790):
   - Change from dependency `[prefill]` to `[]` (empty deps, fire once on mount)
   - Use ref guard to prevent re-fire:
   ```javascript
   const prefillConsumedRef = useRef(false);

   useEffect(() => {
     if (prefill && !prefillConsumedRef.current) {
       const niche = typeof prefill === "string" ? prefill : prefill.niche;
       const prior = typeof prefill === "string" ? null : prefill.priorDiscovery;
       setQuery(niche || "");
       setPriorDiscovery(prior);
       prefillConsumedRef.current = true;
       const t = setTimeout(() => { runRef.current?.(); }, 80);
       onPrefillConsumed?.();
       return () => clearTimeout(t);
     }
   }, []); // Empty deps — fire only once
   ```

2. Verify B2BPanel has same pattern (if it has prefill support)

3. Test: User clicks "Dive Deep", prefill triggers, user edits query while analysis runs, prefill does NOT re-trigger

---

## Single-Environment Vercel Rollout Strategy

**Context:** This is a single Vercel Hobby plan deployment with no staging, no preview, no canary. Manual `vercel --prod` is the only deploy path. Git is disconnected.

**Equivalent of progressive rollout:**
Since we can't do percentage rollout on a Hobby plan, the progression looks like this:

### Phase 1: Beta Group Validation (1–2 days)
**Blast radius:** ~5 people (trusted friends, advisors)
- Deploy to niche-gap.vercel.app
- Manually share link only with beta group via Slack/email
- Monitor Vercel logs for abuse patterns (rate-limit hits, 429 responses)
- Watch for errors: streaming timeouts, JSON salvage triggers, Reddit API failures
- Collect feedback on Zeitgeist↔B2C reconciliation quality
- Check Vercel Edge logs for token consumption spikes

**Stop criteria:**
- If 2+ requests to `/api/claude` from unknown IPs appear → someone public shared the domain
- If Vercel logs show 100+ requests in 1 hour → abort to private branch, add additional CORS hardening
- If JSON salvage triggers >3 times → investigate streaming bug regression

### Phase 2: Quiet Public Deploy (2–3 days)
**Blast radius:** Open, but without marketing (no ProductHunt, no Twitter blast)
- Domain is already live (niche-gap.vercel.app)
- Rate limiting is in place (10 req/IP/min)
- Monitoring is active (Vercel logs, console warnings for salvage/timeouts)
- User acquisition is organic (friends share with friends, organic search)
- Traffic expected: 10–50 requests/day

**Stop criteria:**
- If 429 rate-limit responses >5% of all requests → attacker discovered it, add IP whitelisting for legitimate sources
- If Vercel logs show errors clustered by IP → DDoS pattern, escalate to Vercel support
- If first salvage trigger appears → immediately investigate (might indicate SSE buffer regression)

### Phase 3: Full Public Deploy (Day 4+)
**Blast radius:** Public marketing (if desired)
- ProductHunt launch, Twitter share, beta announcements
- Traffic expected: 100–1000 requests/day
- If traffic grows >2000 req/day, evaluate need for upgrade from Hobby plan

**Ongoing monitoring:**
- Vercel Edge logs: token consumption, error rates, IP distribution
- Error alerts: JSON salvage triggers, streaming timeouts, Reddit errors
- User feedback: Product feedback form (not yet implemented, add in v0.5)

---

## Rollback Plan

**Question 1: Can we revert to the previous production build without data loss?**
YES. This is a Vercel Hobby plan. Vercel stores all prior deploys. Revert is a CLI command.

**Question 2: What happens to any in-flight requests if we revert?**
In-flight requests will fail gracefully (client gets error banner). No data loss (all state is client-side).

**Question 3: Can the previous build read data written by the new build?**
N/A — there is no persistent backend storage. All data is client-side React state.

**Question 4: Are there database schema changes?**
No database. All data is client-side.

### Rollback Procedure

**If Phase 1 beta detects a blocking issue:**

```bash
# List all prior deployments
vercel list

# Find the v0.3 (prior) deployment URL
# Example output: https://niche-gap-vx23bc.vercel.app (v0.3 build)

# Revert main domain to prior deployment
# Option A (CLI): not directly available in vercel CLI for Hobby
# Option B (Vercel Dashboard): Settings > Deployments > Select v0.3 > Set as Production
```

**UI path (Vercel Dashboard):**
1. Go to vercel.com → niche-gap project
2. Click "Deployments" tab
3. Find the v0.3 build in the list (search by date: 2026-03-17 or earlier)
4. Click "..." menu → "Set as Production"
5. Wait 30 seconds for DNS to propagate
6. Verify niche-gap.vercel.app returns v0.3 UI (check window.localStorage or a version number in UI if available)

**Rollback time:** <5 minutes (mostly DNS propagation).

**Rollback trigger:**
- Widespread rate-limiting attacks (>50% of requests returning 429)
- JSON salvage triggers >5 times (indicates SSE buffer regression)
- Streaming timeout >20% of requests
- User data loss reports (e.g., "I entered 5 competitors, only 3 showed up, no warning")

**Post-rollback:**
- Investigate root cause (review error logs, code changes)
- Fix the issue in a new branch
- Deploy v0.4.1 hotfix after 4–6 hours
- Or wait for v0.5 if hotfix is too small to justify another deploy

---

## Monitoring Plan: Minimum Viable Observability

**Problem:** Zero observability currently. No Sentry, no analytics, no error tracking. Errors surface only in browser console and in-app banners.

**Solution:** Implement 3-tier monitoring before deploy.

### Tier 1: Vercel Built-in Logs (Free, Zero Config)

**What:** Vercel's function logs for Edge runtime + serverless endpoints.

**How to access:**
1. vercel.com → niche-gap project
2. Click "Deployments" → Latest deployment
3. Click "Logs" tab
4. View real-time logs for `/api/claude` and `/api/reddit` endpoints

**What to watch for:**
- 429 status codes (rate limiting triggered) — counts per IP
- 5xx errors from Anthropic API — indicates upstream issues
- Response times >20 seconds — indicates Vercel Edge timeout risk
- Log lines containing "JSON parse failed" or "salvage" — indicates truncation

**Alerting:** Manual. Review logs every 1–2 hours for first 24 hours post-deploy.

### Tier 2: Client-Side Console Logging (20 minutes to implement)

**What:** Add structured logging to client JS for errors and significant events.

**Code to add:**
```javascript
// In pages/index.js, wrap major operations:

async function runB2C() {
  console.log('[B2C] Starting analysis for niche: ' + query);
  try {
    const result = await synthesizeB2C(...);
    console.log('[B2C] Success. Score: ' + result.opportunityScore);
  } catch (e) {
    console.error('[B2C] Failed: ' + e.message);
    // Also log to server (Tier 3)
    logToServer('B2C', 'error', e.message);
  }
}

// At EOF:
async function logToServer(category, level, message) {
  // Optional: send to a server endpoint if you add one
  // For now, just console logs are visible in Vercel logs if user opens DevTools
}
```

**Metrics to log:**
- `[ZEITGEIST] scan_started, scan_completed, score=...`
- `[B2C] started, fetch_phase_completed, synthesize_phase_completed`
- `[SALVAGE] JSON salvage triggered (indicates truncation)`
- `[TIMEOUT] Streaming timeout detected`
- `[ERROR] ... (any error with category)`

**Verification:** User opens browser DevTools (F12), Console tab, sees structured logs.

### Tier 3: Sentry Integration (Optional, Deferred to v0.5)

**What:** Production error tracking with alerting.

**Why defer:** Setup takes 1–2 hours; not required for limited beta, but essential before v1.0 product launch.

**When to add:** v0.5, once monitoring shows stable error patterns.

---

## Post-Deploy Verification: 5-Minute Smoke Test

**Jason's checklist immediately after `vercel --prod`:**

### 1. Zeitgeist Scan (1 min)
- [ ] Open niche-gap.vercel.app
- [ ] Click "Scan the Zeitgeist" button
- [ ] Watch status bar: "Scanning the Zeitgeist…"
- [ ] Verify results appear within 10 seconds
- [ ] Check first 3 opportunities have scores (e.g., 68, 45, 72)
- [ ] Verify pagination works (if >5 results, click next)
- [ ] **Expected:** Fast, 10+ opportunities with varied scores

### 2. B2C Deep-Dive (Prefill from Zeitgeist) (1 min)
- [ ] Click "Dive Deep →" on first Zeitgeist result (e.g., "sleep tracking")
- [ ] Tab auto-switches to B2C
- [ ] Query field is prefilled with niche name
- [ ] Analysis starts automatically
- [ ] Verify reconciliation text appears in verdict (should reference Zeitgeist score)
- [ ] Example text: "Despite strong category interest (Zeitgeist: 68), live Reddit signal is modest…"
- [ ] **Expected:** Reconciliation rule is in effect, scores are explained

### 3. Landscape with Pausality (1 min)
- [ ] Go to Landscape tab
- [ ] Space: "meditation apps"
- [ ] Competitors: "Calm, Headspace, Pausality"
- [ ] Click "Analyze"
- [ ] Wait for "Fetching data…" then "Building landscape…"
- [ ] Verify all 3 competitors appear in results
- [ ] Verify Pausality is found (not marked "NOT FOUND")
- [ ] **Expected:** Pausality hardcoded ID lookup succeeds

### 4. Saved Tab (1 min)
- [ ] Go back to B2C tab
- [ ] Click "🔖 Save" on any result
- [ ] Go to Saved tab
- [ ] Verify result appears in list with score, niche, verdict snippet
- [ ] Verify you can add a note and it persists while on this tab
- [ ] Note: Refresh will lose this (no localStorage yet — expected)
- [ ] **Expected:** Save flow works, UI displays saved item

### 5. priorDiscovery Threading Check (Optional, 30 sec)
- [ ] In B2C tab with prefill from Zeitgeist, check that query field shows the prefilled niche
- [ ] Try editing the query (add a word)
- [ ] Verify that if you then navigate away and back, the query change is NOT reset
- [ ] **Expected:** priorDiscovery does not re-fire on query edit

---

## Communication Plan

**Who needs to know about this deploy:**
- **Jason Fields** (jasonpfields@googlemail.com) — product owner, only user for this release
- **Beta group** (TBD) — ~5 trusted friends, advisors (distribute link manually)
- **No public announcement** until end of Phase 2

### Deploy Notification (Jason only, immediately after `vercel --prod`)

Email subject: `v0.4 Niche Gap Deployed — Ready for Beta`

Body:
```
v0.4 is now live at niche-gap.vercel.app

What's new:
- Zeitgeist→B2C reconciliation: Score deltas are now explained in the verdict
- SSE buffer fix: Long Claude responses no longer truncate mid-stream
- Pausality fallback: Pausality always discoverable in Landscape (hardcoded ID)
- Banner ground-truth: "Not found" banners reflect actual search results, not Claude confidence

Rate limiting is now in place (10 requests/IP/min). If you see a 429 error, you've hit the limit.

Smoke test checklist: [5-minute checklist above]

Known issues (deferred to v0.5):
- No localStorage persistence for Saved list (lost on refresh)
- No error monitoring (errors visible in DevTools console only)
- Single-file architecture (2440 lines, refactor pending)

Ready for limited beta? Share niche-gap.vercel.app link with ~5 trusted people.
Monitor Vercel logs (vercel.com → Deployments → Logs) for errors/abuse patterns.

— Agent 6 Release Manager
```

### Beta Group Onboarding (Day 1, if going to beta)

Email subject: `Niche Gap v0.4 Beta — Try It Out`

Body:
```
Niche Gap is now available for limited beta testing.

Start here: https://niche-gap.vercel.app

Try this workflow:
1. Click "Scan the Zeitgeist" to find 10+ market opportunities
2. Click "Dive Deep" on any opportunity to run a detailed analysis
3. Go to "Landscape" tab to compare competitors in a space
4. Save opportunities you like to your "Saved" shortlist

The tool combines Reddit demand signals, App Store data, and Claude synthesis to surface unmet market needs.

Feedback appreciated. Report issues / suggestions in this Slack thread.

This is a limited beta — please don't share the URL publicly yet.

Known limitations:
- Saved opportunities are lost on page refresh (we'll add persistence in v0.5)
- No email/account system (you're using the same shared app)

Have fun. — Jason
```

---

## Post-Deploy Verification: Hour 1–24 Monitoring

**Jason's monitoring checklist (hourly for first 4 hours, then 4x daily):**

### Hour 0 (immediately post-deploy)
- [ ] Run 5-minute smoke test (above)
- [ ] Open Vercel logs, check for errors
- [ ] Verify rate limiting is working: make >10 requests in quick succession, verify 429 on 11th
- [ ] Check Anthropic API usage dashboard (console.anthropic.com): verify consumption is steady (not spiking)

### Hour 1–4
- [ ] Check Vercel logs every 30 minutes
- [ ] Watch for: error spikes, rate-limit patterns, IP clustering
- [ ] If rate-limit 429s appear: note which IPs, check if recognizable (your test requests? or external?)
- [ ] If first salvage trigger appears: investigate immediately (might be SSE buffer regression)

### Hour 4–24
- [ ] Check logs 4x daily (morning, noon, evening, before bed)
- [ ] Collect metrics:
  - Total requests to `/api/claude`: should be 5–50 if only you are using it
  - Error rate: should be 0–1%
  - Rate-limit hits: should be 0 (unless you triggered them testing)
  - Anthropic token consumption: document baseline for v0.5 planning
- [ ] Beta group feedback: monitor Slack for issues/feedback

### Day 2+
- [ ] Transition to 1x daily check (morning)
- [ ] Watch Anthropic API bill for unexpected charges
- [ ] If stable for 3 days with no issues: clear for Phase 2 (wider beta)

---

## Pre-Release Checklist (Gate to `vercel --prod`)

**MANDATORY: All items below must be checked before running `vercel --prod`.**

### Code Changes Completed
- [ ] Rate limiting + CORS added to `/pages/api/claude.js`
- [ ] Request validation (max_tokens, message size, model whitelist)
- [ ] Reddit error surfacing in client (read `_error`, display toast)
- [ ] Streaming timeout detection in `streamClaude()`
- [ ] JSON salvage logging + `truncated` flag
- [ ] `priorDiscovery` effect fixed (useRef guard, fire once)

### Testing (Local)
- [ ] `npm run dev` starts without errors
- [ ] Zeitgeist scan completes in <10 seconds
- [ ] B2C prefill from Zeitgeist works (niche auto-populated, analysis runs, reconciliation text appears)
- [ ] Landscape with Pausality succeeds (all competitors found, Pausality included)
- [ ] Rate limiting: 11 requests returns 429 on 11th
- [ ] Request validation: max_tokens=10000 returns 400
- [ ] Error handling: simulate Reddit 503, see error toast
- [ ] Timeout detection: simulate >3s no-chunk, see "Response timed out" error

### Build
- [ ] `npm run build` succeeds with zero warnings
- [ ] No TypeScript errors (codebase is JS, so this is just sanity)
- [ ] .next folder exists and is <5MB (reasonable for Vercel Hobby)

### Vercel
- [ ] Logged into Vercel CLI: `vercel login`
- [ ] Correct project selected: `vercel project ls` shows niche-gap
- [ ] Env var confirmed: ANTHROPIC_API_KEY is set in Vercel project settings
- [ ] Prior backup: Note v0.3 deployment date (for rollback reference)

### Go/No-Go Decision
- [ ] All prior agent findings reviewed and understood
- [ ] All blockers resolved or documented with explicit risk acceptance
- [ ] Jason has reviewed smoke test checklist and agrees to execute it
- [ ] Monitoring plan understood (Vercel logs, console warnings, Anthropic usage)

### Ready to Deploy
```bash
# Final confirmation
git status                    # Should be clean (no uncommitted changes)
npm run build                 # Final build verification
vercel --prod                 # DEPLOY
# Wait 60 seconds for DNS propagation
# Verify niche-gap.vercel.app loads
# Run 5-minute smoke test
# Monitor Vercel logs for first 4 hours
```

---

## Risk Acceptance Statement

**If any of the 5 blockers are not fixed before deploy, acknowledge this risk:**

- **Cost burn:** Unmitigated rate-limit surface remains. App can be destroyed by external bad actors within 24 hours.
- **User trust:** Truncated analyses and timeout errors will occur silently if salvage logging is not in place.
- **State confusion:** priorDiscovery race can reset user's query while they're typing, causing data loss of user intent.
- **Data integrity:** Reddit errors and streaming timeouts will be masked from the user, causing incorrect analyses.

**All five blockers are LOW EFFORT and MUST BE FIXED.**

---

## Sign-Off

**Verdict:** CONDITIONAL

**Conditions to lift:**
1. Rate limiting + CORS on `/api/claude`
2. Reddit error surfacing
3. Streaming timeout detection
4. JSON salvage logging + truncation flag
5. priorDiscovery effect race fix

**Time to remediation:** 4–5 hours development + 30 min testing = 1 sprint.

**Confidence level:** HIGH. All five items are well-scoped, low-risk, and provided with specific code guidance.

**Post-deploy:** Phase 1 beta (1–2 days) → Phase 2 quiet public (2–3 days) → Phase 3 full public (marketing).

**For the record:** The product value is excellent, the fixes are sound, and the engineering is solid. The only gap is operational readiness — a fixable problem, not a fundamental one. Once these five blockers are lifted, v0.4 is a strong release that moves the product toward product-market fit.

---

**Report generated:** 2026-04-07
**Auditor:** Agent 6 — Release Manager (Captain)
**Confidence:** HIGH
**License:** CC BY 4.0 — jasonpfields.com — @fasonista

---

## Appendix: Quick Reference

### Deploy Command
```bash
vercel --prod
```

### Rollback Command (Vercel Dashboard)
Dashboard → niche-gap → Deployments → Select v0.3 build → "Set as Production"

### Monitoring URLs
- Vercel logs: https://vercel.com/jasonpfields/niche-gap/deployments → Logs tab
- Anthropic usage: https://console.anthropic.com/account/usage

### 5-Minute Smoke Test Script
Copy-paste into browser console at niche-gap.vercel.app:
```javascript
console.log('[TEST] v0.4 Niche Gap Smoke Test Started');
console.log('[TEST] URL: ' + window.location.href);
console.log('[TEST] Expected: Fast Zeitgeist scan, Pausality in Landscape, reconciliation text in B2C');
console.log('[TEST] See checklist above for detailed steps');
```

### Beta Group Share Template
```
Try Niche Gap v0.4: https://niche-gap.vercel.app

1. Click "Scan the Zeitgeist"
2. "Dive Deep" on any result
3. Try "Landscape" to analyze competitors

Please don't share this URL publicly yet (limited beta). Feedback appreciated!
```
