// pages/api/reddit.js
// Server-side proxy for Reddit's public JSON API.
//
// Reddit has been increasingly aggressive about 403-ing unauthenticated
// requests that look like generic browsers. Two things help materially:
//
//   1. A compliant, descriptive User-Agent string matching Reddit's stated
//      format: "<platform>:<appname>:<version> (by /u/<username>)".
//   2. Routing through old.reddit.com, which has looser bot gating than
//      www.reddit.com for the JSON endpoint.
//
// If the primary request still fails, we retry once with an alternate UA
// and the www. hostname as a fallback. Cache-Control on the proxy response
// keeps successful hits at the edge for 5 minutes.

const PRIMARY_UA = "web:niche-gap:1.3 (by /u/nichegap_bot)";
const FALLBACK_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function buildHeaders(userAgent) {
  return {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": userAgent,
    "Cache-Control": "no-cache",
  };
}

// Rewrite a www.reddit.com URL to old.reddit.com — the old host has looser
// bot gating for the JSON endpoint and is otherwise equivalent.
function toOldReddit(url) {
  return url.replace(/^https:\/\/(www\.)?reddit\.com\//, "https://old.reddit.com/");
}

async function tryFetch(url, userAgent) {
  return fetch(url, { headers: buildHeaders(userAgent) });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });

  if (!url.startsWith("https://www.reddit.com/") && !url.startsWith("https://reddit.com/") && !url.startsWith("https://old.reddit.com/")) {
    return res.status(403).json({ error: "Only reddit.com URLs allowed" });
  }

  const oldUrl = toOldReddit(url);
  const attempts = [
    { url: oldUrl, ua: PRIMARY_UA, label: "old+primary" },
    { url: url,    ua: PRIMARY_UA, label: "www+primary" },
    { url: oldUrl, ua: FALLBACK_UA, label: "old+fallback" },
  ];

  let lastStatus = 0;
  let lastErr = "";
  for (const a of attempts) {
    try {
      const upstream = await tryFetch(a.url, a.ua);
      if (upstream.ok) {
        const data = await upstream.json();
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
        return res.status(200).json(data);
      }
      lastStatus = upstream.status;
      lastErr = `Reddit returned ${upstream.status} via ${a.label}`;
      // On 429 we stop retrying immediately — retrying won't help and may make
      // things worse. On 403 / 5xx we let the loop try the next attempt.
      if (upstream.status === 429) break;
    } catch (err) {
      lastErr = `Reddit fetch threw via ${a.label}: ${err?.message || err}`;
    }
  }

  // Graceful degradation: return an empty valid shape so the client doesn't
  // crash, but flag `_failed` so the run banner can surface the warning.
  console.error("Reddit proxy: all attempts failed —", lastErr);
  return res.status(200).json({
    data: { children: [] },
    _error: lastErr || "Reddit fetch failed",
    _failed: true,
    _status: lastStatus || 0,
  });
}
