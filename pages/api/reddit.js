// pages/api/reddit.js
// Server-side proxy for Reddit's JSON API.
//
// TWO MODES:
//
//   1. **Authenticated (preferred).**  Set REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET
//      as env vars (from a "script"-type app at https://www.reddit.com/prefs/apps).
//      The proxy fetches an OAuth2 bearer token via client-credentials grant,
//      caches it for ~55 minutes, and routes every request through
//      oauth.reddit.com — giving us 100 QPM with a proper bot UA and no 403s.
//
//   2. **Unauthenticated fallback.**  If the env vars are missing, the proxy
//      falls back to 3-attempt UA/hostname rotation against the public JSON
//      endpoint. This still works intermittently but fails often on Vercel's
//      IP ranges due to Reddit's bot gating.
//
// The proxy always returns a valid shape — even on total failure it sends back
// `{ data: { children: [] }, _failed: true }` so the client degrades gracefully.

// ── Config ──────────────────────────────────────────────────────────────────
const REDDIT_CLIENT_ID     = process.env.REDDIT_CLIENT_ID     || "";
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || "";
const OAUTH_ENABLED        = !!(REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET);

const PRIMARY_UA  = `web:niche-gap:1.4 (by /u/nichegap_bot)`;
const FALLBACK_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

// ── OAuth token cache (module-level, survives warm invocations) ─────────────
let _cachedToken  = null;
let _tokenExpires = 0;   // epoch-ms

async function getOAuthToken() {
  // Return cached token if still valid (with 5-min buffer)
  if (_cachedToken && Date.now() < _tokenExpires - 300_000) {
    return _cachedToken;
  }

  const basic = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type":  "application/x-www-form-urlencoded",
      "User-Agent":    PRIMARY_UA,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OAuth token request failed: ${res.status} — ${txt}`);
  }

  const json = await res.json();
  _cachedToken  = json.access_token;
  // Reddit tokens last 3600s by default; we cache for 55 min to be safe
  _tokenExpires = Date.now() + (json.expires_in ? (json.expires_in - 300) * 1000 : 3300_000);
  return _cachedToken;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function buildHeaders(userAgent) {
  return {
    "Accept":          "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":      userAgent,
    "Cache-Control":   "no-cache",
  };
}

// Rewrite to old.reddit.com — looser bot gating for unauthenticated requests
function toOldReddit(url) {
  return url.replace(/^https:\/\/(www\.)?reddit\.com\//, "https://old.reddit.com/");
}

// Rewrite any reddit host to oauth.reddit.com for authenticated requests
function toOAuth(url) {
  return url.replace(/^https:\/\/(www\.|old\.)?reddit\.com\//, "https://oauth.reddit.com/");
}

// ── Fetch strategies ────────────────────────────────────────────────────────

async function fetchAuthenticated(url) {
  const token   = await getOAuthToken();
  const oauthUrl = toOAuth(url);
  const res = await fetch(oauthUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent":    PRIMARY_UA,
      "Accept":        "application/json",
    },
  });
  return res;
}

async function fetchUnauthenticated(url) {
  const oldUrl   = toOldReddit(url);
  const attempts = [
    { url: oldUrl, ua: PRIMARY_UA,  label: "old+primary"  },
    { url: url,    ua: PRIMARY_UA,  label: "www+primary"  },
    { url: oldUrl, ua: FALLBACK_UA, label: "old+fallback" },
  ];

  let lastStatus = 0;
  let lastErr    = "";
  for (const a of attempts) {
    try {
      const upstream = await fetch(a.url, { headers: buildHeaders(a.ua) });
      if (upstream.ok) return upstream;
      lastStatus = upstream.status;
      lastErr    = `Reddit returned ${upstream.status} via ${a.label}`;
      if (upstream.status === 429) break;   // don't hammer on rate-limit
    } catch (err) {
      lastErr = `fetch threw via ${a.label}: ${err?.message || err}`;
    }
  }

  // Synthesise a failed Response-like so the caller can handle it uniformly
  return { ok: false, status: lastStatus, _lastErr: lastErr, json: async () => ({}) };
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });

  if (
    !url.startsWith("https://www.reddit.com/") &&
    !url.startsWith("https://reddit.com/")     &&
    !url.startsWith("https://old.reddit.com/")
  ) {
    return res.status(403).json({ error: "Only reddit.com URLs allowed" });
  }

  try {
    // ── Authenticated path (preferred) ────────────────────────────────────
    if (OAUTH_ENABLED) {
      try {
        const upstream = await fetchAuthenticated(url);
        if (upstream.ok) {
          const data = await upstream.json();
          res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
          return res.status(200).json(data);
        }
        // If the token is stale / revoked, invalidate and fall through to unauth
        if (upstream.status === 401 || upstream.status === 403) {
          _cachedToken = null;
          _tokenExpires = 0;
          console.warn("Reddit OAuth: token rejected, falling through to unauthenticated");
        } else {
          // 429 or 5xx from OAuth — still return graceful failure
          const errMsg = `Reddit OAuth returned ${upstream.status}`;
          console.error("Reddit proxy (OAuth):", errMsg);
          return res.status(200).json({
            data: { children: [] }, _error: errMsg, _failed: true, _status: upstream.status,
          });
        }
      } catch (oauthErr) {
        console.warn("Reddit OAuth error, falling through:", oauthErr?.message);
        // Fall through to unauthenticated
      }
    }

    // ── Unauthenticated path (fallback) ───────────────────────────────────
    const upstream = await fetchUnauthenticated(url);
    if (upstream.ok) {
      const data = await upstream.json();
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
      return res.status(200).json(data);
    }

    const errMsg = upstream._lastErr || `Reddit returned ${upstream.status}`;
    console.error("Reddit proxy: all attempts failed —", errMsg);
    return res.status(200).json({
      data: { children: [] }, _error: errMsg, _failed: true, _status: upstream.status || 0,
    });

  } catch (topErr) {
    console.error("Reddit proxy: unexpected error —", topErr?.message || topErr);
    return res.status(200).json({
      data: { children: [] }, _error: topErr?.message || "Unexpected proxy error", _failed: true, _status: 0,
    });
  }
}
