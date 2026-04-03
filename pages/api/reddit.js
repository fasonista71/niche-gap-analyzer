// pages/api/reddit.js
// Server-side proxy for Reddit JSON API — avoids browser CORS restrictions

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });

  // Whitelist only reddit.com to prevent open proxy abuse
  if (!url.startsWith("https://www.reddit.com/") && !url.startsWith("https://reddit.com/")) {
    return res.status(403).json({ error: "Only reddit.com URLs allowed" });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "NicheGapAnalyzer/0.1 (research tool)",
      },
    });

    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate"); // 5min cache
    res.status(200).json(data);
  } catch (err) {
    console.error("Reddit proxy error:", err);
    res.status(502).json({ error: "Reddit fetch failed", posts: [] });
  }
}
