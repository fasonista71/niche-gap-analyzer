import { useState } from "react";
import Head from "next/head";

const C = {
  bg: "#0a0a0b", surface: "#111114", border: "#1e1e24", borderLit: "#2e2e3a",
  accent: "#e8ff47", muted: "#4a4a5a", text: "#e2e2e8", textDim: "#8888a0",
  red: "#ff4d4d", green: "#47ffb2", orange: "#ffab47",
};

function Tag({ label, color = C.accent }) {
  return <span style={{ display: "inline-block", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: C.bg, background: color, padding: "2px 8px", borderRadius: 2, fontWeight: 700 }}>{label}</span>;
}

function ScoreRing({ score, size = 72 }) {
  const r = size / 2 - 6, circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 70 ? C.green : pct >= 45 ? C.orange : C.red;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`, fill: color, fontSize: 15, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
        {pct}
      </text>
    </svg>
  );
}

function Pulse() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent, animation: "pulse 1.1s ease-in-out infinite", animationDelay: `${d}s` }}/>
      ))}
    </span>
  );
}

// ── Export utilities ───────────────────────────────────────────────────────
function exportMarkdown(query, competitors, result) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const compLine = competitors?.length > 0 ? `**Competitors analyzed:** ${competitors.join(", ")}\n` : "";
  const matrix = result.competitorMatrix?.length > 0 ? `
## Competitor Matrix

| App | Rating | Top Complaint | Missing Feature | Price | Vulnerability |
|-----|--------|---------------|-----------------|-------|---------------|
${result.competitorMatrix.map(c => `| ${c.name} | ★${c.rating?.toFixed(1)} | ${c.topComplaint} | ${c.missingFeature} | ${c.pricePoint} | ${c.weaknessScore}/100 |`).join("\n")}

**Shared Whitespace:** ${result.sharedWeakness || "N/A"}
` : "";

  const demandQuotes = result.demandQuotes?.length > 0 ? `
## Raw Demand Expressions

${result.demandQuotes.map(q => `> "${q.quote}" *(${q.type}${q.upvotes > 0 ? ` · ↑${q.upvotes}` : ""})*`).join("\n\n")}
` : "";

  const md = `# Niche Gap Analysis: ${query}
*Generated ${date} · niche-gap.vercel.app*

${compLine}
---

## Opportunity Score: ${result.opportunityScore}/100

**Verdict:** ${result.verdict}

| | |
|---|---|
| Demand Strength | ${result.demandStrength} |
| Competition Level | ${result.competitionLevel} |

---

## Top Pain Themes

${result.topPainThemes?.map(t => `### ${t.theme} (${t.frequency})\n${t.exactPhrases?.map(p => `- "${p}"`).join("\n") || ""}`).join("\n\n")}

---

## Missing Features

${result.missingFeatures?.map(f => `- ${f}`).join("\n")}
${matrix}${demandQuotes}
---

## Positioning Angle

> "${result.positioningAngle}"

**Target Audience:** ${result.targetAudience}

---

## Build Recommendation

${result.buildRecommendation}

---

## Reddit Signal

> "${result.redditInsight}"

---

## Risks & Caveats

${result.warnings?.map(w => `- ⚠ ${w}`).join("\n")}

---
*Sources: Reddit API · App Store RSS · Claude Synthesis*
`;

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `niche-gap-${query.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportHTML(query, competitors, result, appData) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const scoreColor = result.opportunityScore >= 70 ? "#47ffb2" : result.opportunityScore >= 45 ? "#ffab47" : "#ff4d4d";
  const demandColor = result.demandStrength === "HIGH" ? "#47ffb2" : result.demandStrength === "MEDIUM" ? "#ffab47" : "#ff4d4d";
  const compColor = result.competitionLevel === "ABSENT" || result.competitionLevel === "THIN" ? "#47ffb2" : result.competitionLevel === "MODERATE" ? "#ffab47" : "#ff4d4d";

  const matrixHTML = result.competitorMatrix?.length > 0 ? `
    <section>
      <h2>Competitor Matrix</h2>
      <table>
        <thead><tr><th>App</th><th>Rating</th><th>Top Complaint</th><th>Missing Feature</th><th>Price</th><th>Vulnerability</th></tr></thead>
        <tbody>
          ${result.competitorMatrix.map(c => {
            const vc = c.weaknessScore >= 70 ? "#47ffb2" : c.weaknessScore >= 45 ? "#ffab47" : "#ff4d4d";
            return `<tr><td><strong>${c.name}</strong></td><td style="color:${c.rating>=4?"#47ffb2":c.rating>=3?"#ffab47":"#ff4d4d"}">★${c.rating?.toFixed(1)}</td><td>${c.topComplaint}</td><td>${c.missingFeature}</td><td>${c.pricePoint}</td><td style="color:${vc}">${c.weaknessScore}/100</td></tr>`;
          }).join("")}
        </tbody>
      </table>
      ${result.sharedWeakness ? `<div class="callout orange"><span class="label">Shared Whitespace</span><p class="serif italic">"${result.sharedWeakness}"</p></div>` : ""}
    </section>` : "";

  const demandHTML = result.demandQuotes?.length > 0 ? `
    <section>
      <h2>Raw Demand Expressions</h2>
      <div class="quote-grid">
        ${result.demandQuotes.map(q => `
          <div class="quote-card ${q.type}">
            <div class="quote-meta">${q.type === "seeking" ? "↗ seeking" : "↘ lamenting"}${q.upvotes > 0 ? ` · ↑${q.upvotes}` : ""}</div>
            <p class="serif italic">"${q.quote}"</p>
          </div>`).join("")}
      </div>
    </section>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Niche Gap Report: ${query}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0a0b;color:#e2e2e8;font-family:'DM Sans',sans-serif;max-width:860px;margin:0 auto;padding:48px 32px 80px}
  h1{font-family:'Instrument Serif',serif;font-size:40px;font-weight:400;line-height:1.1;margin-bottom:8px}
  h1 em{color:#e8ff47;font-style:italic}
  h2{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8888a0;margin-bottom:16px;margin-top:0}
  section{background:#111114;border:1px solid #1e1e24;border-radius:8px;padding:24px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#4a4a5a;text-align:left;padding:0 12px 10px 0}
  td{padding:10px 12px 10px 0;color:#8888a0;border-top:1px solid #1e1e24;vertical-align:top}
  td:first-child{color:#e2e2e8}
  .mono{font-family:'DM Mono',monospace}
  .serif{font-family:'Instrument Serif',serif}
  .italic{font-style:italic}
  .meta{font-family:'DM Mono',monospace;font-size:11px;color:#4a4a5a;margin-bottom:32px}
  .score-row{display:flex;align-items:center;gap:24px;margin-bottom:0}
  .score-num{font-family:'DM Mono',monospace;font-size:52px;font-weight:700;color:${scoreColor};line-height:1}
  .verdict{font-family:'Instrument Serif',serif;font-size:22px;line-height:1.4;flex:1}
  .tags{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
  .tag{display:inline-block;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0b;padding:2px 8px;border-radius:2px;font-weight:700}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  .theme{margin-bottom:14px}
  .theme-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .theme-name{font-size:13px;font-weight:600}
  .phrases{display:flex;flex-wrap:wrap;gap:4px}
  .phrase{font-family:'DM Mono',monospace;font-size:11px;color:#8888a0;background:#1e1e24;padding:2px 7px;border-radius:2px}
  .feature{display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;font-size:13px;line-height:1.5}
  .arrow{color:#e8ff47;font-size:14px;flex-shrink:0}
  .callout{padding:14px 18px;border-radius:6px;margin-top:16px}
  .callout.accent{background:rgba(232,255,71,0.05);border:1px solid rgba(232,255,71,0.2)}
  .callout.orange{background:rgba(255,171,71,0.07);border:1px solid rgba(255,171,71,0.2)}
  .label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;display:block;margin-bottom:6px}
  .callout.accent .label{color:#e8ff47}
  .callout.orange .label{color:#ffab47}
  .callout p{font-size:15px;line-height:1.5}
  .quote-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
  .quote-card{padding:12px 14px;background:#0a0a0b;border-radius:6px}
  .quote-card.seeking{border:1px solid rgba(232,255,71,0.2)}
  .quote-card.lamenting{border:1px solid rgba(255,171,71,0.2)}
  .quote-meta{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px}
  .quote-card.seeking .quote-meta{color:#e8ff47}
  .quote-card.lamenting .quote-meta{color:#ffab47}
  .quote-card p{font-size:14px;line-height:1.5;color:#e2e2e8}
  .risk{display:flex;gap:10px;margin-bottom:8px;font-size:13px;color:#8888a0;line-height:1.6}
  .warning-icon{color:#ff4d4d;flex-shrink:0}
  .divider{border:none;border-top:1px solid #1e1e24;margin:32px 0}
  .footer{font-family:'DM Mono',monospace;font-size:10px;color:#4a4a5a;display:flex;justify-content:space-between}
  @media print{body{padding:24px}button{display:none!important}}
</style>
</head>
<body>
  <div style="margin-bottom:40px">
    <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#e8ff47;margin-bottom:14px">Niche Gap Analyzer</div>
    <h1>Gap Report:<br/><em>${query}</em></h1>
    <p class="meta">${date}${competitors?.length > 0 ? ` · Competitors: ${competitors.join(", ")}` : ""}</p>
    <button onclick="window.print()" style="background:#e8ff47;color:#0a0a0b;border:none;cursor:pointer;padding:10px 20px;font-family:'DM Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px">Save as PDF</button>
  </div>

  <section>
    <div class="score-row">
      <div class="score-num">${result.opportunityScore}</div>
      <div>
        <div class="tags">
          <span class="tag" style="background:${demandColor}">Demand: ${result.demandStrength}</span>
          <span class="tag" style="background:${compColor}">Competition: ${result.competitionLevel}</span>
          ${appData ? `<span class="tag" style="background:#4a4a5a">${appData.name}</span>` : ""}
        </div>
        <p class="verdict">${result.verdict}</p>
      </div>
    </div>
  </section>

  ${matrixHTML}

  <div class="grid-2">
    <section>
      <h2>Top Pain Themes</h2>
      ${result.topPainThemes?.map(t => {
        const tc = t.frequency === "HIGH" ? "#ff4d4d" : t.frequency === "MED" ? "#ffab47" : "#4a4a5a";
        return `<div class="theme">
          <div class="theme-head"><span class="theme-name">${t.theme}</span><span class="tag" style="background:${tc}">${t.frequency}</span></div>
          <div class="phrases">${t.exactPhrases?.map(p => `<span class="phrase">"${p}"</span>`).join("") || ""}</div>
        </div>`;
      }).join("") || ""}
    </section>
    <section>
      <h2>Missing Features</h2>
      ${result.missingFeatures?.map(f => `<div class="feature"><span class="arrow">→</span><span>${f}</span></div>`).join("") || ""}
      <hr style="border:none;border-top:1px solid #1e1e24;margin:20px 0 16px"/>
      <h2>Target Audience</h2>
      <p style="font-size:13px;color:#8888a0;line-height:1.6">${result.targetAudience}</p>
    </section>
  </div>

  ${demandHTML}

  <div class="grid-2">
    <section>
      <h2>Positioning Angle</h2>
      <div class="callout accent"><p class="serif italic">"${result.positioningAngle}"</p></div>
    </section>
    <section>
      <h2>Build Recommendation</h2>
      <p style="font-size:13px;line-height:1.6">${result.buildRecommendation}</p>
    </section>
  </div>

  <div class="grid-2">
    <section>
      <h2>Reddit Signal</h2>
      <p style="font-size:13px;color:#8888a0;line-height:1.7;font-style:italic">"${result.redditInsight}"</p>
    </section>
    <section style="border-color:rgba(255,77,77,0.2)">
      <h2 style="color:#ff4d4d">Risks & Caveats</h2>
      ${result.warnings?.map(w => `<div class="risk"><span class="warning-icon">⚠</span><span>${w}</span></div>`).join("") || ""}
    </section>
  </div>

  <hr class="divider"/>
  <div class="footer">
    <span>SOURCES: Reddit API · App Store RSS · Claude Synthesis</span>
    <span>niche-gap.vercel.app</span>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

async function redditFetch(url) {
  const res = await fetch(`/api/reddit?url=${encodeURIComponent(url)}`);
  return res.json();
}

async function fetchRedditSignals(query) {
  const subs = ["SaaS", "indiehackers", "startups", "nocode", "Entrepreneur", "apps"];
  try {
    const data = await redditFetch(`https://www.reddit.com/r/${subs.join("+")}/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=25&restrict_sr=false&t=year`);
    return (data?.data?.children || []).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 400), score: p.data.score, subreddit: p.data.subreddit }));
  } catch { return []; }
}

async function fetchRedditDemandSignals(query) {
  const searches = [`"is there an app" ${query}`, `"why is there no" ${query}`];
  const results = await Promise.all(searches.map(async (q, i) => {
    try {
      const data = await redditFetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=15&t=all&type=link`);
      return (data?.data?.children || []).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 300), score: p.data.score, subreddit: p.data.subreddit, demandType: i === 0 ? "seeking" : "lamenting" }));
    } catch { return []; }
  }));
  const seen = new Set();
  return results.flat().filter(p => { if (seen.has(p.title)) return false; seen.add(p.title); return true; }).sort((a, b) => b.score - a.score);
}

async function fetchAppStoreSignals(query) {
  try {
    const s = await (await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=1&country=us`)).json();
    const app = s?.results?.[0];
    if (!app) return { app: null, reviews: [] };
    const rv = await (await fetch(`https://itunes.apple.com/rss/customerreviews/page=1/id=${app.trackId}/sortby=mostrecent/json`)).json();
    const reviews = (rv?.feed?.entry || []).slice(1).map(e => ({ title: e.title?.label || "", content: e.content?.label || "", rating: parseInt(e["im:rating"]?.label || "3") }));
    return { app: { name: app.trackName, developer: app.artistName, rating: app.averageUserRating, reviews: app.userRatingCount, category: app.primaryGenreName, icon: app.artworkUrl60 }, reviews };
  } catch { return { app: null, reviews: [] }; }
}

async function fetchCompetitorData(appName) {
  try {
    const s = await (await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(appName)}&entity=software&limit=1&country=us`)).json();
    const app = s?.results?.[0];
    let appInfo = null, lowReviews = [];
    if (app) {
      const rv = await (await fetch(`https://itunes.apple.com/rss/customerreviews/page=1/id=${app.trackId}/sortby=mostrecent/json`)).json();
      lowReviews = (rv?.feed?.entry || []).slice(1).map(e => ({ title: e.title?.label || "", content: e.content?.label || "", rating: parseInt(e["im:rating"]?.label || "3") })).filter(r => r.rating <= 2).slice(0, 6);
      appInfo = { name: app.trackName, developer: app.artistName, rating: app.averageUserRating, reviewCount: app.userRatingCount, category: app.primaryGenreName, icon: app.artworkUrl60, price: app.formattedPrice };
    }
    const rd = await redditFetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(appName + " app")}&sort=relevance&limit=10&t=year`);
    const mentions = (rd?.data?.children || []).slice(0, 5).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 200), score: p.data.score, subreddit: p.data.subreddit }));
    return { appName, appInfo, lowReviews, mentions };
  } catch { return { appName, appInfo: null, lowReviews: [], mentions: [] }; }
}

async function synthesizeWithClaude(query, redditPosts, demandPosts, appStoreData, competitorData, onChunk) {
  const redditSummary = redditPosts.slice(0, 10).map(p => `[r/${p.subreddit}] "${p.title}" — ${p.selftext?.slice(0, 200) || "no body"}`).join("\n");
  const demandSummary = demandPosts.slice(0, 10).map(p => `[${p.demandType === "seeking" ? "SEEKING" : "LAMENTING"} · r/${p.subreddit} · ↑${p.score}] "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 200)}` : ""}`).join("\n");
  const reviewSummary = appStoreData.reviews.filter(r => r.rating <= 2).slice(0, 10).map(r => `★${r.rating} "${r.title}": ${r.content?.slice(0, 200)}`).join("\n");
  const appInfo = appStoreData.app ? `"${appStoreData.app.name}" by ${appStoreData.app.developer} — ★${appStoreData.app.rating?.toFixed(1)} from ${appStoreData.app.reviews?.toLocaleString()} reviews` : "No strong App Store competitor found — potential whitespace.";

  const competitorSection = competitorData.length > 0 ? `\nNAMED COMPETITOR INTELLIGENCE:\n${competitorData.map(c => {
    if (!c.appInfo) return `${c.appName}: Not found on App Store.`;
    const reviews = c.lowReviews.map(r => `  ★${r.rating} "${r.title}": ${r.content?.slice(0,150)}`).join("\n") || "  No low-rated reviews.";
    const mentions = c.mentions.map(m => `  [r/${m.subreddit} ↑${m.score}] "${m.title}"`).join("\n") || "  No Reddit mentions.";
    return `${c.appInfo.name} — ★${c.appInfo.rating?.toFixed(1)} · ${c.appInfo.reviewCount?.toLocaleString()} reviews · ${c.appInfo.price || "Free"} · ${c.appInfo.category}\n  Low-rated reviews:\n${reviews}\n  Reddit mentions:\n${mentions}`;
  }).join("\n\n")}` : "";

  const prompt = `You are a sharp product strategist and market researcher. Analyze signals for the niche: "${query}"

APP STORE INTELLIGENCE (auto-detected): ${appInfo}
LOW-RATED REVIEWS: ${reviewSummary || "None found."}
${competitorSection}
REDDIT — GENERAL: ${redditSummary || "None found."}
REDDIT — RAW DEMAND ("is there an app" / "why doesn't X exist"): ${demandSummary || "None found."}

Weight RAW DEMAND expressions most heavily — purest signal.
${competitorData.length > 0 ? "For NAMED COMPETITORS: gaps ALL of them fail to solve = highest-value whitespace." : ""}

Respond JSON only, no markdown:

{
  "opportunityScore": <0-100>,
  "verdict": "<one punchy sentence>",
  "demandStrength": "<HIGH|MEDIUM|LOW>",
  "competitionLevel": "<SATURATED|MODERATE|THIN|ABSENT>",
  "topPainThemes": [{ "theme": "<n>", "frequency": "<HIGH|MED|LOW>", "exactPhrases": ["<p1>","<p2>"] }],
  "missingFeatures": ["<f1>","<f2>","<f3>"],
  "positioningAngle": "<one-liner>",
  "targetAudience": "<specific>",
  "redditInsight": "<most revealing signal>",
  "demandQuotes": [{ "quote": "<verbatim>", "type": "<seeking|lamenting>", "upvotes": <n> }],
  "competitorMatrix": [{ "name": "<app>", "rating": <n>, "topComplaint": "<complaint>", "missingFeature": "<feature>", "pricePoint": "<price>", "weaknessScore": <0-100> }],
  "sharedWeakness": "<gap ALL named competitors fail to solve>",
  "buildRecommendation": "<1-2 specific features that would win>",
  "warnings": ["<risk1>","<risk2>"]
}`;

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1200, stream: true, messages: [{ role: "user", content: prompt }] }),
  });

  let fullText = "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
      try { const j = JSON.parse(line.slice(6)); if (j.type === "content_block_delta") { fullText += j.delta?.text || ""; onChunk(fullText); } } catch {}
    }
  }
  try { return JSON.parse(fullText.replace(/```json|```/g, "").trim()); } catch { return null; }
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState(null);
  const [demandCount, setDemandCount] = useState(0);
  const [appData, setAppData] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [history, setHistory] = useState([]);

  const addCompetitor = () => {
    const name = competitorInput.trim();
    if (!name || competitors.length >= 5 || competitors.includes(name)) return;
    setCompetitors(c => [...c, name]);
    setCompetitorInput("");
  };

  const removeCompetitor = (name) => setCompetitors(c => c.filter(x => x !== name));

  const run = async () => {
    if (!query.trim() || phase === "fetching" || phase === "synthesizing") return;
    setResult(null); setStreamText(""); setAppData(null); setDemandCount(0);
    try {
      setPhase("fetching");
      setPhaseLabel(competitors.length > 0 ? `Scanning Reddit + fetching ${competitors.length} competitor${competitors.length > 1 ? "s" : ""}…` : "Scanning Reddit for pain signals + demand expressions…");
      const [redditPosts, demandPosts, appStoreData, ...competitorResults] = await Promise.all([
        fetchRedditSignals(query),
        fetchRedditDemandSignals(query),
        fetchAppStoreSignals(query),
        ...competitors.map(c => fetchCompetitorData(c)),
      ]);
      setDemandCount(demandPosts.length);
      setAppData(appStoreData.app);
      setPhase("synthesizing");
      setPhaseLabel("Synthesizing gap analysis…");
      const analysis = await synthesizeWithClaude(query, redditPosts, demandPosts, appStoreData, competitorResults, p => setStreamText(p));
      if (analysis) { setResult(analysis); setHistory(h => [{ query, competitors: [...competitors], analysis }, ...h.slice(0, 4)]); setPhase("done"); }
      else setPhase("error");
    } catch (e) { console.error(e); setPhase("error"); }
  };

  const demandColor = d => d === "HIGH" ? C.green : d === "MEDIUM" ? C.orange : C.red;
  const compColor = c => c === "ABSENT" || c === "THIN" ? C.green : c === "MODERATE" ? C.orange : C.red;
  const busy = phase === "fetching" || phase === "synthesizing";

  return (
    <>
      <Head>
        <title>Niche Gap Analyzer</title>
        <meta name="description" content="Find what people want that nobody's built yet." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
          *{box-sizing:border-box;margin:0;padding:0}
          ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0b}::-webkit-scrollbar-thumb{background:#1e1e24;border-radius:2px}
          ::selection{background:#e8ff47;color:#0a0a0b}
        `}</style>
      </Head>

      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.012) 2px,rgba(255,255,255,.012) 4px)", pointerEvents: "none", zIndex: 0 }}/>
        <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle,${C.accent}18 0%,transparent 70%)`, pointerEvents: "none", zIndex: 0 }}/>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 48, animation: "fadeUp .6s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="7" cy="7" r="5" stroke={C.bg} strokeWidth="2"/>
                  <path d="M11 11l4 4" stroke={C.bg} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M7 4v6M4 7h6" stroke={C.bg} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, fontWeight: 500 }}>Niche Gap Analyzer</span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 12 }}>
              Find what people want<br/><em style={{ color: C.accent }}>that nobody's built yet.</em>
            </h1>
            <p style={{ color: C.textDim, fontSize: 15, maxWidth: 500, lineHeight: 1.6 }}>
              Cross-references Reddit pain signals with App Store gaps. Add known competitors for a deeper matrix analysis.
            </p>
          </div>

          {/* Inputs */}
          <div style={{ animation: "fadeUp .6s .1s ease both" }}>
            {/* Query */}
            <div style={{ display: "flex", border: `1px solid ${busy ? C.accent : C.borderLit}`, borderRadius: 6, overflow: "hidden", transition: "border-color .3s", boxShadow: busy ? `0 0 0 3px ${C.accent}22` : "none", marginBottom: 12 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
                placeholder="e.g. meditation, sleep tracking, freelance invoicing…"
                style={{ flex: 1, background: C.surface, border: "none", outline: "none", color: C.text, fontSize: 15, padding: "16px 20px", fontFamily: "'DM Sans', sans-serif" }}/>
              <button onClick={run} disabled={!query.trim() || busy} style={{ background: query.trim() ? C.accent : C.muted, color: C.bg, border: "none", cursor: query.trim() && !busy ? "pointer" : "default", padding: "16px 28px", fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", transition: "background .2s", whiteSpace: "nowrap" }}>
                {busy ? <Pulse /> : "Analyze"}
              </button>
            </div>

            {/* Competitor input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", background: C.surface }}>
                <span style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap", borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>
                  + competitor
                </span>
                <input value={competitorInput} onChange={e => setCompetitorInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addCompetitor()}
                  placeholder={competitors.length >= 5 ? "Max 5 reached" : "e.g. Calm, Headspace, Insight Timer…"}
                  disabled={competitors.length >= 5}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 13, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif" }}/>
              </div>
              <button onClick={addCompetitor} disabled={!competitorInput.trim() || competitors.length >= 5}
                style={{ background: competitorInput.trim() && competitors.length < 5 ? C.borderLit : C.border, color: C.text, border: "none", cursor: "pointer", padding: "10px 18px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "background .2s" }}>
                Add
              </button>
            </div>

            {/* Competitor chips */}
            {competitors.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                {competitors.map(name => (
                  <div key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 4, padding: "4px 10px" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.accent }}>{name}</span>
                    <button onClick={() => removeCompetitor(name)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}>×</button>
                  </div>
                ))}
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>{5 - competitors.length} slot{5 - competitors.length !== 1 ? "s" : ""} remaining</span>
              </div>
            )}

            {/* Quick examples */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["sleep tracking", "ADHD focus", "freelance invoicing", "meal planning", "habit tracking"].map(ex => (
                <button key={ex} onClick={() => setQuery(ex)}
                  style={{ background: "none", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "4px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "border-color .2s,color .2s" }}
                  onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textDim; }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {busy && (
            <div style={{ marginTop: 32, padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12, animation: "fadeUp .3s ease both" }}>
              <Pulse />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textDim }}>{phaseLabel}</span>
              {demandCount > 0 && <span style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.accent }}>{demandCount} demand expressions found</span>}
            </div>
          )}

          {phase === "synthesizing" && streamText && (
            <div style={{ marginTop: 12, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 120, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent)" }}>
              {streamText.slice(-400)}
            </div>
          )}

          {phase === "error" && (
            <div style={{ marginTop: 32, padding: 20, border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6, color: C.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
              Analysis failed. Check your connection and try again.
            </div>
          )}

          {/* Results */}
          {phase === "done" && result && (
            <div style={{ marginTop: 40, animation: "fadeUp .5s ease both" }}>

              {/* Export buttons */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={() => exportMarkdown(query, competitors, result)}
                  style={{ background: "none", border: `1px solid ${C.borderLit}`, color: C.textDim, cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7, transition: "border-color .2s, color .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLit; e.currentTarget.style.color = C.textDim; }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Markdown
                </button>
                <button onClick={() => exportHTML(query, competitors, result, appData)}
                  style={{ background: C.accent, border: `1px solid ${C.accent}`, color: C.bg, cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Export Report
                </button>
              </div>

              {/* Score + verdict */}
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "24px 28px", background: C.surface, border: `1px solid ${C.borderLit}`, borderRadius: 8, marginBottom: 20 }}>
                <ScoreRing score={result.opportunityScore} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <Tag label={`Demand: ${result.demandStrength}`} color={demandColor(result.demandStrength)} />
                    <Tag label={`Competition: ${result.competitionLevel}`} color={compColor(result.competitionLevel)} />
                    {appData && <Tag label={appData.name} color={C.muted} />}
                  </div>
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, lineHeight: 1.4 }}>{result.verdict}</p>
                </div>
              </div>

              {/* Competitor Matrix */}
              {result.competitorMatrix?.length > 0 && (
                <div style={{ marginBottom: 16, padding: "20px 22px", background: C.surface, border: `1px solid ${C.orange}44`, borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
                    <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.orange }}>Competitor Matrix</h3>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>— vulnerability analysis</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["App", "Rating", "Top Complaint", "Missing Feature", "Price", "Vulnerability"].map(h => (
                            <th key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, textAlign: "left", padding: "0 12px 10px 0", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.competitorMatrix.map((c, i) => {
                          const vc = c.weaknessScore >= 70 ? C.green : c.weaknessScore >= 45 ? C.orange : C.red;
                          return (
                            <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                              <td style={{ padding: "10px 12px 10px 0", fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>{c.name}</td>
                              <td style={{ padding: "10px 12px 10px 0", fontFamily: "'DM Mono', monospace", color: c.rating >= 4 ? C.green : c.rating >= 3 ? C.orange : C.red }}>★{c.rating?.toFixed(1)}</td>
                              <td style={{ padding: "10px 12px 10px 0", color: C.textDim, maxWidth: 200 }}>{c.topComplaint}</td>
                              <td style={{ padding: "10px 12px 10px 0", color: C.textDim, maxWidth: 200 }}>{c.missingFeature}</td>
                              <td style={{ padding: "10px 12px 10px 0", fontFamily: "'DM Mono', monospace", color: C.textDim, whiteSpace: "nowrap" }}>{c.pricePoint}</td>
                              <td style={{ padding: "10px 0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ width: 60, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                    <div style={{ width: `${c.weaknessScore}%`, height: "100%", background: vc, transition: "width 1s ease" }}/>
                                  </div>
                                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: vc }}>{c.weaknessScore}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {result.sharedWeakness && (
                    <div style={{ marginTop: 16, padding: "12px 16px", background: `${C.orange}11`, border: `1px solid ${C.orange}33`, borderRadius: 6 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.orange, display: "block", marginBottom: 5 }}>Shared Whitespace</span>
                      <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 15, lineHeight: 1.5, fontStyle: "italic", color: C.text }}>"{result.sharedWeakness}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pain themes + Missing features */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 14 }}>Top Pain Themes</h3>
                  {result.topPainThemes?.map((t, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{t.theme}</span>
                        <Tag label={t.frequency} color={t.frequency === "HIGH" ? C.red : t.frequency === "MED" ? C.orange : C.muted} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {t.exactPhrases?.map((p, j) => <span key={j} style={{ fontSize: 11, color: C.textDim, fontFamily: "'DM Mono', monospace", background: C.border, padding: "2px 7px", borderRadius: 2 }}>"{p}"</span>)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 14 }}>Missing Features</h3>
                  {result.missingFeatures?.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                      <span style={{ color: C.accent, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                    <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 8 }}>Target Audience</h3>
                    <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{result.targetAudience}</p>
                  </div>
                </div>
              </div>

              {/* Demand quotes */}
              {result.demandQuotes?.length > 0 && (
                <div style={{ padding: "20px 22px", marginBottom: 16, background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent }}>Raw Demand Expressions</h3>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>— people explicitly asking for something that doesn't exist</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                    {result.demandQuotes.map((q, i) => (
                      <div key={i} style={{ padding: "12px 14px", background: C.bg, border: `1px solid ${q.type === "seeking" ? C.accent + "33" : C.orange + "33"}`, borderRadius: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: q.type === "seeking" ? C.accent : C.orange }}>{q.type === "seeking" ? "↗ seeking" : "↘ lamenting"}</span>
                          {q.upvotes > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.muted }}>↑{q.upvotes}</span>}
                        </div>
                        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 14, lineHeight: 1.5, fontStyle: "italic" }}>"{q.quote}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positioning + Build rec */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ padding: "20px 22px", background: `${C.accent}0d`, border: `1px solid ${C.accent}33`, borderRadius: 8 }}>
                  <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, marginBottom: 10 }}>Positioning Angle</h3>
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, lineHeight: 1.5, fontStyle: "italic" }}>"{result.positioningAngle}"</p>
                </div>
                <div style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 10 }}>Build Recommendation</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6 }}>{result.buildRecommendation}</p>
                </div>
              </div>

              {/* Reddit insight + Warnings */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 10 }}>Reddit Signal</h3>
                  <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, fontStyle: "italic" }}>"{result.redditInsight}"</p>
                </div>
                <div style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.red}33`, borderRadius: 8 }}>
                  <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.red, marginBottom: 10 }}>Risks & Caveats</h3>
                  {result.warnings?.map((w, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ color: C.red, fontSize: 12, flexShrink: 0, lineHeight: 1.6 }}>⚠</span>
                      <span style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {appData && (
                <div style={{ marginTop: 16, padding: "16px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
                  {appData.icon && <img src={appData.icon} alt={appData.name} style={{ width: 40, height: 40, borderRadius: 8 }}/>}
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>Auto-detected Competitor</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{appData.name}</div>
                    <div style={{ fontSize: 12, color: C.textDim }}>{appData.developer} · {appData.category} · ★{appData.rating?.toFixed(1)} ({appData.reviews?.toLocaleString()} reviews)</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div style={{ marginTop: 48 }}>
              <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 14 }}>Recent Analyses</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {history.slice(1).map((h, i) => (
                  <button key={i} onClick={() => { setQuery(h.query); setCompetitors(h.competitors || []); setResult(h.analysis); setPhase("done"); }}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: h.analysis.opportunityScore >= 70 ? C.green : h.analysis.opportunityScore >= 45 ? C.orange : C.red, fontSize: 10 }}>●</span>
                    {h.query}
                    {h.competitors?.length > 0 && <span style={{ color: C.muted }}>+{h.competitors.length}</span>}
                    <span style={{ color: C.muted }}>{h.analysis.opportunityScore}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 60, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>SOURCES: Reddit API · App Store RSS · Claude Synthesis</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>v0.2 · jasonpfields.com</span>
          </div>

        </div>
      </div>
    </>
  );
}
