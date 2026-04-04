// pages/api/reddit.js
// Server-side proxy for Reddit JSON API

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });

  if (!url.startsWith("https://www.reddit.com/") && !url.startsWith("https://reddit.com/")) {
    return res.status(403).json({ error: "Only reddit.com URLs allowed" });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    if (!upstream.ok) {
      // Return empty but valid response so client can handle gracefully
      return res.status(200).json({ data: { children: [] }, _error: `Reddit returned ${upstream.status}` });
    }

    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    res.status(200).json(data);
  } catch (err) {
    console.error("Reddit proxy error:", err);
    // Return empty valid response instead of 502
    res.status(200).json({ data: { children: [] }, _error: "Reddit fetch failed" });
  }
}
