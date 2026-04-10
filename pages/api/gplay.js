// pages/api/gplay.js
// Server-side proxy for Google Play Store data via google-play-scraper.
//
// Two modes:
//   ?action=search&q=meditation    → search for apps by keyword
//   ?action=reviews&appId=com.x.y  → fetch reviews for a specific app
//
// No API key required — the scraper works against public Play Store pages.
// Cache successful responses at the edge for 10 minutes.

import gplay from "google-play-scraper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { action, q, appId } = req.query;

  try {
    if (action === "search" && q) {
      const results = await gplay.search({
        term: q,
        num: 8,
        lang: "en",
        country: "us",
      });
      const apps = results.map(app => ({
        appId: app.appId,
        title: app.title,
        developer: app.developer,
        score: app.score,
        ratings: app.ratings,
        reviews: app.reviews,
        installs: app.installs,
        free: app.free,
        icon: app.icon,
        url: app.url,
        genre: app.genre,
        summary: (app.summary || "").slice(0, 200),
      }));
      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
      return res.status(200).json({ apps });
    }

    if (action === "reviews" && appId) {
      const result = await gplay.reviews({
        appId,
        lang: "en",
        country: "us",
        sort: gplay.sort.NEWEST,
        num: 100,
      });
      const reviews = (result.data || []).map(r => ({
        id: r.id,
        userName: r.userName,
        score: r.score,
        title: r.title || "",
        text: (r.text || "").slice(0, 400),
        thumbsUp: r.thumbsUp || 0,
        date: r.date,
        version: r.version,
      }));
      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
      return res.status(200).json({ reviews, appId });
    }

    return res.status(400).json({ error: "Provide action=search&q=... or action=reviews&appId=..." });
  } catch (err) {
    console.error("Google Play proxy error:", err?.message || err);
    return res.status(200).json({
      apps: [],
      reviews: [],
      _failed: true,
      _error: err?.message || "Google Play fetch failed",
    });
  }
}
