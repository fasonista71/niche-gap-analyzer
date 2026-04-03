// pages/api/claude.js
// Server-side proxy — Anthropic API key never touches the browser

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    // Stream the response straight through
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.status(upstream.status);

    const reader = upstream.body.getReader();
    const flush = () => {
      reader.read().then(({ done, value }) => {
        if (done) { res.end(); return; }
        res.write(value);
        flush();
      });
    };
    flush();
  } catch (err) {
    console.error("Claude proxy error:", err);
    res.status(502).json({ error: "Upstream request failed" });
  }
}
