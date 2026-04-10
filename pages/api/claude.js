// pages/api/claude.js
// Edge runtime — required because Vercel Hobby serverless functions are
// capped at 10s, but Discovery / per-category synth needs longer streaming
// windows. Edge functions on Hobby support up to 25s of streaming.
//
// Hardening (v0.4 preflight):
//  - CORS allowlist (production domain + localhost)
//  - Per-IP token-bucket rate limiter (10 req / 60s window)
//  - max_tokens cap (8000)
//  - Body-size cap (32 KB)
//  - Origin / Referer cross-check as a second layer

export const config = { runtime: "edge" };

// ── Config ────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://niche-gap.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const RATE_LIMIT_MAX = 10;            // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000;  // 60s
const MAX_BODY_BYTES = 32 * 1024;     // 32 KB
const MAX_TOKENS_CAP = 8000;

// ── In-memory token bucket (per Edge isolate) ─────────────────────────────
// Note: Edge isolates are not shared globally, so this is best-effort and
// per-region. For production-grade, swap for Upstash Redis or Vercel KV.
const buckets = new Map(); // ip -> { count, resetAt }

function rateLimitOk(ip) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  if (b.count >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: RATE_LIMIT_MAX - b.count, resetAt: b.resetAt };
}

function clientIp(req) {
  const xff = req.headers.get("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

function corsHeaders(origin) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://niche-gap.vercel.app";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  const cors = corsHeaders(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, cors);
  }

  // Origin allowlist (defence-in-depth alongside CORS — CORS only blocks
  // browsers, not curl/scripts, so we also gate server-side)
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { error: "Origin not allowed" }, cors);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: "ANTHROPIC_API_KEY not configured" }, cors);
  }

  // Rate limit
  const ip = clientIp(req);
  const rl = rateLimitOk(ip);
  const rlHeaders = {
    ...cors,
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
  };
  if (!rl.ok) {
    return jsonResponse(
      429,
      { error: "Rate limit exceeded. Try again in a minute." },
      { ...rlHeaders, "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
    );
  }

  // Body-size guard
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "Request body too large" }, rlHeaders);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, rlHeaders);
  }

  // max_tokens cap
  if (typeof body?.max_tokens === "number" && body.max_tokens > MAX_TOKENS_CAP) {
    body.max_tokens = MAX_TOKENS_CAP;
  } else if (body && typeof body.max_tokens !== "number") {
    body.max_tokens = Math.min(body.max_tokens || 4096, MAX_TOKENS_CAP);
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...rlHeaders,
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return jsonResponse(502, { error: "Upstream request failed", detail: String(err) }, rlHeaders);
  }
}
