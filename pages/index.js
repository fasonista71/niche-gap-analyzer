import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const C = {
  bg: "#0a0a0b", surface: "#111114", border: "#1e1e24", borderLit: "#2e2e3a",
  accent: "#e8ff47", accentB2B: "#7c6fff", muted: "#4a4a5a", text: "#e2e2e8", textDim: "#8888a0",
  red: "#ff4d4d", green: "#47ffb2", orange: "#ffab47",
};

// ── Shared UI components ───────────────────────────────────────────────────
function Tag({ label, color = C.accent }) {
  return <span style={{ display: "inline-block", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: C.bg, background: color, padding: "2px 8px", borderRadius: 2, fontWeight: 700 }}>{label}</span>;
}

function ScoreRing({ score, size = 72, accent = C.accent }) {
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

function Pulse({ color = C.accent }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: color, animation: "pulse 1.1s ease-in-out infinite", animationDelay: `${d}s` }}/>
      ))}
    </span>
  );
}

function ChipInput({ label, placeholder, items, onAdd, onRemove, max = 5, accentColor = C.accent }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim().replace(/^r\//i, "");
    if (!v || items.length >= max || items.includes(v)) return;
    onAdd(v); setVal("");
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: items.length > 0 ? 10 : 0 }}>
        <div style={{ flex: 1, display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", background: C.surface }}>
          <span style={{ padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap", borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>{label}</span>
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
            placeholder={items.length >= max ? `Max ${max} reached` : placeholder}
            disabled={items.length >= max}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 13, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif" }}/>
        </div>
        <button onClick={add} disabled={!val.trim() || items.length >= max}
          style={{ background: val.trim() && items.length < max ? C.borderLit : C.border, color: C.text, border: "none", cursor: "pointer", padding: "10px 16px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "background .2s" }}>
          Add
        </button>
      </div>
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {items.map(name => (
            <div key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${accentColor}44`, borderRadius: 4, padding: "4px 10px" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: accentColor }}>{name}</span>
              <button onClick={() => onRemove(name)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}>×</button>
            </div>
          ))}
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>{max - items.length} slot{max - items.length !== 1 ? "s" : ""} remaining</span>
        </div>
      )}
    </div>
  );
}

// ── Export utilities ───────────────────────────────────────────────────────
function exportMarkdown(query, competitors, result, mode = "b2c") {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const compLine = competitors?.length > 0 ? `**Competitors analyzed:** ${competitors.join(", ")}\n` : "";
  const matrix = result.competitorMatrix?.length > 0 ? `\n## Competitor Matrix\n\n| App | Rating | Top Complaint | Missing Feature | Price | Vulnerability |\n|-----|--------|---------------|-----------------|-------|---------------|\n${result.competitorMatrix.map(c => `| ${c.name} | ★${c.rating?.toFixed(1)} | ${c.topComplaint} | ${c.missingFeature} | ${c.pricePoint} | ${c.weaknessScore}/100 |`).join("\n")}\n\n**Shared Whitespace:** ${result.sharedWeakness || "N/A"}\n` : "";
  const demandQuotes = result.demandQuotes?.length > 0 ? `\n## Raw Demand Expressions\n\n${result.demandQuotes.map(q => `> "${q.quote}" *(${q.type}${q.upvotes > 0 ? ` · ↑${q.upvotes}` : ""})*`).join("\n\n")}\n` : "";
  const b2bSection = mode === "b2b" && result.buyerInsights ? `\n## Buyer Insights\n\n${result.buyerInsights}\n\n**ICP:** ${result.icp || "N/A"}\n\n**GTM Motion:** ${result.gtmMotion || "N/A"}\n` : "";

  const md = `# Niche Gap Analysis: ${query}\n*Generated ${date} · niche-gap.vercel.app · Mode: ${mode.toUpperCase()}*\n\n${compLine}\n---\n\n## Opportunity Score: ${result.opportunityScore}/100\n\n**Verdict:** ${result.verdict}\n\n| | |\n|---|---|\n| Demand Strength | ${result.demandStrength} |\n| Competition Level | ${result.competitionLevel} |\n\n---\n\n## Top Pain Themes\n\n${result.topPainThemes?.map(t => `### ${t.theme} (${t.frequency})\n${t.exactPhrases?.map(p => `- "${p}"`).join("\n") || ""}`).join("\n\n")}\n\n---\n\n## Missing Features\n\n${result.missingFeatures?.map(f => `- ${f}`).join("\n")}\n${matrix}${demandQuotes}${b2bSection}\n---\n\n## Positioning Angle\n\n> "${result.positioningAngle}"\n\n**Target:** ${result.targetAudience}\n\n---\n\n## Build Recommendation\n\n${result.buildRecommendation}\n\n---\n\n## Risks & Caveats\n\n${result.warnings?.map(w => `- ⚠ ${w}`).join("\n")}\n\n---\n*Sources: Reddit API · ${mode === "b2b" ? "G2/Capterra · LinkedIn" : "App Store RSS"} · Claude Synthesis*\n`;

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `niche-gap-${mode}-${query.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportHTML(query, competitors, result, appData, mode = "b2c") {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const accentHex = mode === "b2b" ? "#7c6fff" : "#e8ff47";
  const scoreColor = result.opportunityScore >= 70 ? "#47ffb2" : result.opportunityScore >= 45 ? "#ffab47" : "#ff4d4d";
  const demandColor = result.demandStrength === "HIGH" ? "#47ffb2" : result.demandStrength === "MEDIUM" ? "#ffab47" : "#ff4d4d";
  const compColor = result.competitionLevel === "ABSENT" || result.competitionLevel === "THIN" ? "#47ffb2" : result.competitionLevel === "MODERATE" ? "#ffab47" : "#ff4d4d";

  const matrixHTML = result.competitorMatrix?.length > 0 ? `<section><h2>Competitor Matrix</h2><div style="overflow-x:auto"><table><thead><tr><th>App</th><th>Rating</th><th>Top Complaint</th><th>Missing Feature</th><th>Price</th><th>Vulnerability</th></tr></thead><tbody>${result.competitorMatrix.map(c => { const vc = c.weaknessScore >= 70 ? "#47ffb2" : c.weaknessScore >= 45 ? "#ffab47" : "#ff4d4d"; return `<tr><td><strong>${c.name}</strong></td><td style="color:${c.rating>=4?"#47ffb2":c.rating>=3?"#ffab47":"#ff4d4d"}">★${c.rating?.toFixed(1)}</td><td>${c.topComplaint}</td><td>${c.missingFeature}</td><td>${c.pricePoint}</td><td style="color:${vc}">${c.weaknessScore}/100</td></tr>`; }).join("")}</tbody></table></div>${result.sharedWeakness ? `<div class="callout orange"><span class="label">Shared Whitespace</span><p class="serif italic">"${result.sharedWeakness}"</p></div>` : ""}</section>` : "";

  const demandHTML = result.demandQuotes?.length > 0 ? `<section><h2>Raw Demand Expressions</h2><div class="quote-grid">${result.demandQuotes.map(q => `<div class="quote-card ${q.type}"><div class="quote-meta">${q.type === "seeking" ? "↗ seeking" : "↘ lamenting"}${q.upvotes > 0 ? ` · ↑${q.upvotes}` : ""}</div><p class="serif italic">"${q.quote}"</p></div>`).join("")}</div></section>` : "";

  const b2bHTML = mode === "b2b" && result.buyerInsights ? `<section><h2>Buyer Insights</h2><p style="font-size:13px;line-height:1.7;margin-bottom:16px">${result.buyerInsights}</p>${result.icp ? `<div class="callout accent"><span class="label">ICP</span><p>${result.icp}</p></div>` : ""}${result.gtmMotion ? `<div style="margin-top:12px;padding:12px 16px;background:rgba(124,111,255,0.07);border:1px solid rgba(124,111,255,0.2);border-radius:6px"><span class="label" style="color:#7c6fff">GTM Motion</span><p style="font-size:13px">${result.gtmMotion}</p></div>` : ""}</section>` : "";

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Niche Gap Report: ${query}</title><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0b;color:#e2e2e8;font-family:'DM Sans',sans-serif;max-width:860px;margin:0 auto;padding:48px 32px 80px}h1{font-family:'Instrument Serif',serif;font-size:40px;font-weight:400;line-height:1.1;margin-bottom:8px}h1 em{color:${accentHex};font-style:italic}h2{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8888a0;margin-bottom:16px}section{background:#111114;border:1px solid #1e1e24;border-radius:8px;padding:24px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#4a4a5a;text-align:left;padding:0 12px 10px 0}td{padding:10px 12px 10px 0;color:#8888a0;border-top:1px solid #1e1e24;vertical-align:top}td:first-child{color:#e2e2e8}.serif{font-family:'Instrument Serif',serif}.italic{font-style:italic}.meta{font-family:'DM Mono',monospace;font-size:11px;color:#4a4a5a;margin-bottom:24px}.score-row{display:flex;align-items:center;gap:24px}.score-num{font-family:'DM Mono',monospace;font-size:52px;font-weight:700;color:${scoreColor};line-height:1}.verdict{font-family:'Instrument Serif',serif;font-size:22px;line-height:1.4;flex:1}.tags{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}.tag{display:inline-block;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0b;padding:2px 8px;border-radius:2px;font-weight:700}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.theme{margin-bottom:14px}.theme-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.phrases{display:flex;flex-wrap:wrap;gap:4px}.phrase{font-family:'DM Mono',monospace;font-size:11px;color:#8888a0;background:#1e1e24;padding:2px 7px;border-radius:2px}.feature{display:flex;gap:10px;margin-bottom:10px;font-size:13px;line-height:1.5}.arrow{color:${accentHex}}.callout{padding:14px 18px;border-radius:6px;margin-top:16px}.callout.accent{background:rgba(124,111,255,0.07);border:1px solid rgba(124,111,255,0.2)}.callout.orange{background:rgba(255,171,71,0.07);border:1px solid rgba(255,171,71,0.2)}.label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;display:block;margin-bottom:6px;color:${accentHex}}.callout.orange .label{color:#ffab47}.quote-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.quote-card{padding:12px 14px;background:#0a0a0b;border-radius:6px}.quote-card.seeking{border:1px solid rgba(232,255,71,0.2)}.quote-card.lamenting{border:1px solid rgba(255,171,71,0.2)}.quote-meta{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px}.quote-card.seeking .quote-meta{color:#e8ff47}.quote-card.lamenting .quote-meta{color:#ffab47}.quote-card p{font-size:14px;line-height:1.5;color:#e2e2e8}.risk{display:flex;gap:10px;margin-bottom:8px;font-size:13px;color:#8888a0;line-height:1.6}.footer{font-family:'DM Mono',monospace;font-size:10px;color:#4a4a5a;display:flex;justify-content:space-between;margin-top:32px;padding-top:20px;border-top:1px solid #1e1e24}@media print{button{display:none!important}}</style></head><body><div style="margin-bottom:40px"><div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${accentHex};margin-bottom:14px">Niche Gap Analyzer · ${mode.toUpperCase()}</div><h1>Gap Report:<br/><em>${query}</em></h1><p class="meta">${date}${competitors?.length > 0 ? ` · Competitors: ${competitors.join(", ")}` : ""}</p><button onclick="window.print()" style="background:${accentHex};color:#0a0a0b;border:none;cursor:pointer;padding:10px 20px;font-family:'DM Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px">Save as PDF</button></div><section><div class="score-row"><div class="score-num">${result.opportunityScore}</div><div><div class="tags"><span class="tag" style="background:${demandColor}">Demand: ${result.demandStrength}</span><span class="tag" style="background:${compColor}">Competition: ${result.competitionLevel}</span>${appData ? `<span class="tag" style="background:#4a4a5a">${appData.name}</span>` : ""}</div><p class="verdict">${result.verdict}</p></div></div></section>${matrixHTML}<div class="grid-2"><section><h2>Top Pain Themes</h2>${result.topPainThemes?.map(t => { const tc = t.frequency === "HIGH" ? "#ff4d4d" : t.frequency === "MED" ? "#ffab47" : "#4a4a5a"; return `<div class="theme"><div class="theme-head"><span style="font-size:13px;font-weight:600">${t.theme}</span><span class="tag" style="background:${tc}">${t.frequency}</span></div><div class="phrases">${t.exactPhrases?.map(p => `<span class="phrase">"${p}"</span>`).join("") || ""}</div></div>`; }).join("") || ""}</section><section><h2>Missing Features</h2>${result.missingFeatures?.map(f => `<div class="feature"><span class="arrow">→</span><span>${f}</span></div>`).join("") || ""}<hr style="border:none;border-top:1px solid #1e1e24;margin:16px 0"/><h2>Target</h2><p style="font-size:13px;color:#8888a0;line-height:1.6">${result.targetAudience}</p></section></div>${demandHTML}${b2bHTML}<div class="grid-2"><section><h2>Positioning Angle</h2><div class="callout accent"><p class="serif italic">"${result.positioningAngle}"</p></div></section><section><h2>Build Recommendation</h2><p style="font-size:13px;line-height:1.6">${result.buildRecommendation}</p></section></div><div class="grid-2"><section><h2>Signal</h2><p style="font-size:13px;color:#8888a0;line-height:1.7;font-style:italic">"${result.redditInsight}"</p></section><section style="border-color:rgba(255,77,77,0.2)"><h2 style="color:#ff4d4d">Risks</h2>${result.warnings?.map(w => `<div class="risk"><span style="color:#ff4d4d">⚠</span><span>${w}</span></div>`).join("") || ""}</section></div><div class="footer"><span>SOURCES: Reddit API · ${mode === "b2b" ? "G2/Capterra · LinkedIn" : "App Store RSS"} · Claude Synthesis</span><span>niche-gap.vercel.app</span></div></body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

// ── Data fetchers ──────────────────────────────────────────────────────────
async function redditFetch(url) {
  // Route through server-side proxy only — direct browser calls get CORS 429 from Reddit
  try {
    const res = await fetch(`/api/reddit?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}
  // Return empty structure so callers degrade gracefully
  return { data: { children: [] } };
}

async function fetchRedditSignals(query, customSubs = [], useCustomOnly = false) {
  const defaultSubs = ["SaaS", "indiehackers", "startups", "nocode", "Entrepreneur", "apps"];
  const subs = useCustomOnly && customSubs.length > 0 ? customSubs : customSubs.length > 0 ? [...customSubs, ...defaultSubs] : defaultSubs;
  try {
    const data = await redditFetch(`https://www.reddit.com/r/${subs.join("+")}/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=25&restrict_sr=true&t=year`);
    return (data?.data?.children || []).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 400), score: p.data.score, subreddit: p.data.subreddit }));
  } catch { return []; }
}

async function fetchRedditDemandSignals(query, customSubs = [], useCustomOnly = false) {
  const defaultSubs = ["SaaS", "indiehackers", "startups", "nocode", "Entrepreneur", "apps"];
  const subs = useCustomOnly && customSubs.length > 0 ? customSubs : customSubs.length > 0 ? [...customSubs, ...defaultSubs] : defaultSubs;
  const searches = [`"is there an app" ${query}`, `"why is there no" ${query}`];
  const results = await Promise.all(searches.map(async (q, i) => {
    try {
      const subFilter = subs.length > 0 ? `&restrict_sr=true` : "";
      const url = subs.length > 0
        ? `https://www.reddit.com/r/${subs.join("+")}/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=15&t=all${subFilter}`
        : `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=15&t=all&type=link`;
      const data = await redditFetch(url);
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

// B2B: fetch Reddit signals from professional subs
async function fetchB2BRedditSignals(query, customSubs = [], useCustomOnly = false) {
  const defaultSubs = ["sysadmin", "entrepreneur", "smallbusiness", "sales", "marketing", "projectmanagement", "devops", "humanresources"];
  const subs = useCustomOnly && customSubs.length > 0 ? customSubs : customSubs.length > 0 ? [...customSubs, ...defaultSubs] : defaultSubs;
  try {
    const data = await redditFetch(`https://www.reddit.com/r/${subs.join("+")}/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=25&restrict_sr=true&t=year`);
    return (data?.data?.children || []).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 400), score: p.data.score, subreddit: p.data.subreddit }));
  } catch { return []; }
}

// B2B: fetch G2-style signals via web search proxy
async function fetchB2BReviewSignals(toolName) {
  try {
    const data = await redditFetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(toolName + " review problems complaints alternative")}&sort=relevance&limit=15&t=year`);
    return (data?.data?.children || []).slice(0, 8).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 300), score: p.data.score, subreddit: p.data.subreddit }));
  } catch { return []; }
}

// ── Claude synthesis — B2C ─────────────────────────────────────────────────
async function synthesizeB2C(query, redditPosts, demandPosts, appStoreData, competitorData, onChunk) {
  const redditSummary = redditPosts.slice(0, 10).map(p => `[r/${p.subreddit}] "${p.title}" — ${p.selftext?.slice(0, 200) || "no body"}`).join("\n");
  const demandSummary = demandPosts.slice(0, 10).map(p => `[${p.demandType === "seeking" ? "SEEKING" : "LAMENTING"} · r/${p.subreddit} · ↑${p.score}] "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 200)}` : ""}`).join("\n");
  const reviewSummary = appStoreData.reviews.filter(r => r.rating <= 2).slice(0, 10).map(r => `★${r.rating} "${r.title}": ${r.content?.slice(0, 200)}`).join("\n");
  const appInfo = appStoreData.app ? `"${appStoreData.app.name}" by ${appStoreData.app.developer} — ★${appStoreData.app.rating?.toFixed(1)} from ${appStoreData.app.reviews?.toLocaleString()} reviews` : "No strong App Store competitor found — potential whitespace.";
  const competitorSection = competitorData.length > 0 ? `\nNAMED COMPETITOR INTELLIGENCE:\n${competitorData.map(c => { if (!c.appInfo) return `${c.appName}: Not found on App Store.`; const reviews = c.lowReviews.map(r => `  ★${r.rating} "${r.title}": ${r.content?.slice(0,150)}`).join("\n") || "  No low-rated reviews."; const mentions = c.mentions.map(m => `  [r/${m.subreddit} ↑${m.score}] "${m.title}"`).join("\n") || "  No Reddit mentions."; return `${c.appInfo.name} — ★${c.appInfo.rating?.toFixed(1)} · ${c.appInfo.reviewCount?.toLocaleString()} reviews · ${c.appInfo.price || "Free"} · ${c.appInfo.category}\n  Low-rated reviews:\n${reviews}\n  Reddit mentions:\n${mentions}`; }).join("\n\n")}` : "";

  const prompt = `You are a sharp product strategist. Analyze B2C signals for: "${query}"\n\nAPP STORE (auto-detected): ${appInfo}\nLOW-RATED REVIEWS: ${reviewSummary || "None."}\n${competitorSection}\nREDDIT — GENERAL: ${redditSummary || "None."}\nREDDIT — RAW DEMAND: ${demandSummary || "None."}\n\nWeight RAW DEMAND most heavily. ${competitorData.length > 0 ? "For NAMED COMPETITORS: gaps ALL fail to solve = highest-value whitespace." : ""}\n\nRespond JSON only, no markdown:\n\n{"opportunityScore":<0-100>,"verdict":"<punchy sentence>","demandStrength":"<HIGH|MEDIUM|LOW>","competitionLevel":"<SATURATED|MODERATE|THIN|ABSENT>","topPainThemes":[{"theme":"<n>","frequency":"<HIGH|MED|LOW>","exactPhrases":["<p1>","<p2>"]}],"missingFeatures":["<f1>","<f2>","<f3>"],"positioningAngle":"<one-liner>","targetAudience":"<specific>","redditInsight":"<most revealing>","demandQuotes":[{"quote":"<verbatim>","type":"<seeking|lamenting>","upvotes":<n>}],"competitorMatrix":[{"name":"<app>","rating":<n>,"topComplaint":"<complaint>","missingFeature":"<feature>","pricePoint":"<price>","weaknessScore":<0-100>}],"sharedWeakness":"<gap ALL fail to solve>","buildRecommendation":"<1-2 features>","warnings":["<r1>","<r2>"]}`;

  return streamClaude(prompt, onChunk);
}

// ── Claude synthesis — B2B ─────────────────────────────────────────────────
async function synthesizeB2B(query, redditPosts, demandPosts, competitorReviews, competitorData, onChunk) {
  const redditSummary = redditPosts.slice(0, 10).map(p => `[r/${p.subreddit}] "${p.title}" — ${p.selftext?.slice(0, 200) || "no body"}`).join("\n");
  const demandSummary = demandPosts.slice(0, 10).map(p => `[r/${p.subreddit} · ↑${p.score}] "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 200)}` : ""}`).join("\n");
  const reviewSummary = competitorReviews.map(r => `[${r.subreddit}] "${r.title}": ${r.selftext?.slice(0,200)}`).join("\n");
  const competitorSection = competitorData.length > 0 ? `\nNAMED B2B COMPETITORS:\n${competitorData.map(c => { if (!c.appInfo) return `${c.appName}: Not found on App Store (may be web-only B2B tool).`; const reviews = c.lowReviews.map(r => `  ★${r.rating} "${r.title}": ${r.content?.slice(0,150)}`).join("\n") || "  No low-rated reviews."; const mentions = c.mentions.map(m => `  [r/${m.subreddit} ↑${m.score}] "${m.title}"`).join("\n") || "  No Reddit mentions."; return `${c.appInfo.name} — ★${c.appInfo.rating?.toFixed(1)} · ${c.appInfo.price || "Free"}\n  Reviews:\n${reviews}\n  Mentions:\n${mentions}`; }).join("\n\n")}` : "";

  const prompt = `You are a B2B SaaS product strategist. Analyze enterprise/professional signals for: "${query}"\n\nREDDIT — PROFESSIONAL COMMUNITIES: ${redditSummary || "None."}\nREDDIT — DEMAND SIGNALS: ${demandSummary || "None."}\nCOMPETITOR COMPLAINT SIGNALS: ${reviewSummary || "None."}\n${competitorSection}\n\nFocus on: workflow pain, integration gaps, pricing complaints, onboarding friction, missing enterprise features, buyer vs user misalignment. Think in terms of ICP, GTM motion, and willingness to pay.\n\nRespond JSON only, no markdown:\n\n{"opportunityScore":<0-100>,"verdict":"<punchy sentence>","demandStrength":"<HIGH|MEDIUM|LOW>","competitionLevel":"<SATURATED|MODERATE|THIN|ABSENT>","topPainThemes":[{"theme":"<n>","frequency":"<HIGH|MED|LOW>","exactPhrases":["<p1>","<p2>"]}],"missingFeatures":["<f1>","<f2>","<f3>"],"positioningAngle":"<one-liner>","targetAudience":"<specific job title / company type>","redditInsight":"<most revealing signal>","demandQuotes":[{"quote":"<verbatim>","type":"<seeking|lamenting>","upvotes":<n>}],"competitorMatrix":[{"name":"<tool>","rating":<n>,"topComplaint":"<enterprise complaint>","missingFeature":"<missing feature>","pricePoint":"<pricing>","weaknessScore":<0-100>}],"sharedWeakness":"<gap ALL fail to solve>","icp":"<ideal customer profile — role, company size, industry>","gtmMotion":"<recommended GTM — PLG / sales-led / community-led>","buyerInsights":"<2-3 sentences on buyer psychology and what makes them switch>","buildRecommendation":"<1-2 features that would win enterprise deals>","warnings":["<r1>","<r2>"]}`;

  return streamClaude(prompt, onChunk);
}

async function streamClaude(prompt, onChunk) {
  // Strip surrogate pairs and other problematic Unicode that breaks JSON encoding
  const safePrompt = prompt.replace(/[\uD800-\uDFFF]/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, stream: true, messages: [{ role: "user", content: safePrompt }] }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`Claude API ${response.status}: ${errText.slice(0, 200)}`);
  }

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
  try {
    return JSON.parse(fullText.replace(/```json|```/g, "").trim());
  } catch (e) {
    // Attempt to salvage truncated JSON by closing open structures
    let text = fullText.replace(/```json|```/g, "").trim();
    // Close any unterminated string, array, object
    const openBraces = (text.match(/\{/g) || []).length - (text.match(/\}/g) || []).length;
    const openBrackets = (text.match(/\[/g) || []).length - (text.match(/\]/g) || []).length;
    if (openBraces > 0 || openBrackets > 0) {
      // Trim to last complete object (find last complete closing brace before truncation)
      const lastGoodBrace = text.lastIndexOf("},");
      if (lastGoodBrace > 0) {
        text = text.slice(0, lastGoodBrace + 1) + "]" + "}".repeat(openBraces);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      console.error("JSON parse failed after recovery attempt. Raw:", fullText.slice(0, 500));
      throw new Error(`JSON parse failed: ${e.message}. Got: ${fullText.slice(0, 100)}`);
    }
  }
}

// ── Shared results renderer ────────────────────────────────────────────────
function Results({ result, appData, query, competitors, mode, onSave }) {
  const accent = mode === "b2b" ? C.accentB2B : C.accent;
  const demandColor = d => d === "HIGH" ? C.green : d === "MEDIUM" ? C.orange : C.red;
  const compColor = c => c === "ABSENT" || c === "THIN" ? C.green : c === "MODERATE" ? C.orange : C.red;

  return (
    <div style={{ marginTop: 40, animation: "fadeUp .5s ease both" }}>

      {/* Export + Save buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => onSave && onSave({
          niche: query,
          opportunityScore: result.opportunityScore,
          type: result.competitionLevel === "ABSENT" || result.competitionLevel === "THIN" ? "whitespace" : "improve",
          demandStrength: result.demandStrength,
          competitionLevel: result.competitionLevel,
          verdict: result.verdict,
          knownTools: result.competitorMatrix?.map(c => c.name).join(", ") || "None identified",
          buildAngle: result.buildRecommendation,
        }, mode === "b2b" ? "B2B" : "B2C")}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, transition: "border-color .2s, color .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#ffd166"; e.currentTarget.style.color = "#ffd166"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
          🔖 Save
        </button>
        <button onClick={() => exportMarkdown(query, competitors, result, mode)}
          style={{ background: "none", border: `1px solid ${C.borderLit}`, color: C.textDim, cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7, transition: "border-color .2s,color .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLit; e.currentTarget.style.color = C.textDim; }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Markdown
        </button>
        <button onClick={() => exportHTML(query, competitors, result, appData, mode)}
          style={{ background: accent, border: `1px solid ${accent}`, color: C.bg, cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7 }}>
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
            {mode === "b2b" && result.icp && <Tag label="B2B" color={C.accentB2B} />}
          </div>
          <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, lineHeight: 1.4 }}>{result.verdict}</p>
        </div>
      </div>

      {/* B2B-specific: ICP + GTM + Buyer Insights */}
      {mode === "b2b" && (result.icp || result.gtmMotion || result.buyerInsights) && (
        <div style={{ marginBottom: 16, padding: "20px 22px", background: C.surface, border: `1px solid ${C.accentB2B}44`, borderRadius: 8 }}>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accentB2B, marginBottom: 16 }}>B2B Intelligence</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {result.icp && (
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>ICP</div>
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>{result.icp}</p>
              </div>
            )}
            {result.gtmMotion && (
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>GTM Motion</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: C.accentB2B, fontWeight: 600 }}>{result.gtmMotion}</p>
              </div>
            )}
            {result.buyerInsights && (
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>Buyer Psychology</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: C.textDim }}>{result.buyerInsights}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                <tr>{["App / Tool", "Rating", "Top Complaint", "Missing Feature", "Price", "Vulnerability"].map(h => (
                  <th key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, textAlign: "left", padding: "0 12px 10px 0", whiteSpace: "nowrap" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {result.competitorMatrix.map((c, i) => {
                  const vc = c.weaknessScore >= 70 ? C.green : c.weaknessScore >= 45 ? C.orange : C.red;
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 12px 10px 0", fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>{c.name}</td>
                      <td style={{ padding: "10px 12px 10px 0", fontFamily: "'DM Mono', monospace", color: c.rating >= 4 ? C.green : c.rating >= 3 ? C.orange : C.red }}>★{c.rating?.toFixed(1)}</td>
                      <td style={{ padding: "10px 12px 10px 0", color: C.textDim, maxWidth: 180 }}>{c.topComplaint}</td>
                      <td style={{ padding: "10px 12px 10px 0", color: C.textDim, maxWidth: 180 }}>{c.missingFeature}</td>
                      <td style={{ padding: "10px 12px 10px 0", fontFamily: "'DM Mono', monospace", color: C.textDim, whiteSpace: "nowrap" }}>{c.pricePoint}</td>
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${c.weaknessScore}%`, height: "100%", background: vc, transition: "width 1s ease" }}/></div>
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
              <span style={{ color: accent, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>→</span>
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 8 }}>Target</h3>
            <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{result.targetAudience}</p>
          </div>
        </div>
      </div>

      {/* Demand quotes */}
      {result.demandQuotes?.length > 0 && (
        <div style={{ padding: "20px 22px", marginBottom: 16, background: C.surface, border: `1px solid ${accent}44`, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent }}>Raw Demand Expressions</h3>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>— people explicitly asking for something that doesn't exist</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
            {result.demandQuotes.map((q, i) => (
              <div key={i} style={{ padding: "12px 14px", background: C.bg, border: `1px solid ${q.type === "seeking" ? accent + "33" : C.orange + "33"}`, borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: q.type === "seeking" ? accent : C.orange }}>{q.type === "seeking" ? "↗ seeking" : "↘ lamenting"}</span>
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
        <div style={{ padding: "20px 22px", background: `${accent}0d`, border: `1px solid ${accent}33`, borderRadius: 8 }}>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Positioning Angle</h3>
          <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, lineHeight: 1.5, fontStyle: "italic" }}>"{result.positioningAngle}"</p>
        </div>
        <div style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 10 }}>Build Recommendation</h3>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{result.buildRecommendation}</p>
        </div>
      </div>

      {/* Signal + Risks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: "20px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 10 }}>Signal</h3>
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
  );
}

// ── B2C Panel ──────────────────────────────────────────────────────────────
function B2CPanel({ prefill, onPrefillConsumed, onSave }) {
  const [query, setQuery] = useState("");
  const runRef = useRef(null);

  // When Discovery passes a prefill, set it and auto-trigger analysis
  useEffect(() => {
    if (prefill) {
      setQuery(prefill);
      // small delay so query state settles before run fires
      const t = setTimeout(() => { runRef.current?.(); }, 80);
      onPrefillConsumed?.();
      return () => clearTimeout(t);
    }
  }, [prefill]);
  const [competitors, setCompetitors] = useState([]);
  const [subreddits, setSubreddits] = useState([]);
  const [useCustomOnly, setUseCustomOnly] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState(null);
  const [demandCount, setDemandCount] = useState(0);
  const [appData, setAppData] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [history, setHistory] = useState([]);
  const busy = phase === "fetching" || phase === "synthesizing";

  const run = async () => {
    if (!query.trim() || busy) return;
    setResult(null); setStreamText(""); setAppData(null); setDemandCount(0);
    try {
      setPhase("fetching");
      const subLabel = subreddits.length > 0 ? ` in ${subreddits.length} custom sub${subreddits.length > 1 ? "s" : ""}` : "";
      setPhaseLabel(`Scanning Reddit${subLabel}${competitors.length > 0 ? ` + ${competitors.length} competitor${competitors.length > 1 ? "s" : ""}` : ""}…`);
      const [redditPosts, demandPosts, appStoreData, ...competitorResults] = await Promise.all([
        fetchRedditSignals(query, subreddits, useCustomOnly),
        fetchRedditDemandSignals(query, subreddits, useCustomOnly),
        fetchAppStoreSignals(query),
        ...competitors.map(c => fetchCompetitorData(c)),
      ]);
      setDemandCount(demandPosts.length);
      setAppData(appStoreData.app);
      setPhase("synthesizing");
      setPhaseLabel("Synthesizing gap analysis…");
      const analysis = await synthesizeB2C(query, redditPosts, demandPosts, appStoreData, competitorResults, p => setStreamText(p));
      if (analysis) { setResult(analysis); setHistory(h => [{ query, competitors: [...competitors], analysis }, ...h.slice(0, 4)]); setPhase("done"); }
      else setPhase("error");
    } catch (e) { console.error(e); setPhase("error"); }
  };

  const clear = () => {
    setQuery(""); setCompetitors([]); setSubreddits([]); setUseCustomOnly(false);
    setPhase("idle"); setResult(null); setStreamText(""); setAppData(null); setDemandCount(0);
  };

  return (
    <div>
      {/* Query */}
      <div style={{ display: "flex", border: `1px solid ${busy ? C.accent : C.borderLit}`, borderRadius: 6, overflow: "hidden", transition: "border-color .3s", boxShadow: busy ? `0 0 0 3px ${C.accent}22` : "none", marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
          placeholder="e.g. meditation, sleep tracking, freelance invoicing…"
          style={{ flex: 1, background: C.surface, border: "none", outline: "none", color: C.text, fontSize: 15, padding: "16px 20px", fontFamily: "'DM Sans', sans-serif" }}/>
        {(phase === "done" || phase === "error") && (
          <button onClick={clear} style={{ background: "none", color: C.muted, border: "none", borderLeft: `1px solid ${C.border}`, cursor: "pointer", padding: "16px 16px", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", transition: "color .2s", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.color = C.red}
            onMouseLeave={e => e.currentTarget.style.color = C.muted}>
            ✕ Clear
          </button>
        )}
        <button onClick={run} disabled={!query.trim() || busy} style={{ background: query.trim() ? C.accent : C.muted, color: C.bg, border: "none", cursor: query.trim() && !busy ? "pointer" : "default", padding: "16px 28px", fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", transition: "background .2s", whiteSpace: "nowrap" }}>
          {busy ? <Pulse /> : "Analyze"}
        </button>
      </div>

      {/* Subreddit targeting */}
      <div style={{ marginBottom: 12 }}>
        <ChipInput label="r/ target" placeholder="e.g. nursing, meditation, hiking…" items={subreddits} onAdd={s => setSubreddits(p => [...p, s])} onRemove={s => setSubreddits(p => p.filter(x => x !== s))} max={5} accentColor={C.accent} />
        {subreddits.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button onClick={() => setUseCustomOnly(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: useCustomOnly ? C.accent : C.border, transition: "background .2s", position: "relative" }}>
                <div style={{ position: "absolute", top: 3, left: useCustomOnly ? 17 : 3, width: 12, height: 12, borderRadius: "50%", background: useCustomOnly ? C.bg : C.textDim, transition: "left .2s" }}/>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: useCustomOnly ? C.accent : C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {useCustomOnly ? "Custom subs only" : "Custom + default subs"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Competitors */}
      <div style={{ marginBottom: 12 }}>
        <ChipInput label="+ competitor" placeholder="e.g. Calm, Headspace, Insight Timer…" items={competitors} onAdd={c => setCompetitors(p => [...p, c])} onRemove={c => setCompetitors(p => p.filter(x => x !== c))} max={5} accentColor={C.accent} />
      </div>

      {/* Quick examples */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["sleep tracking", "ADHD focus", "freelance invoicing", "meal planning", "habit tracking"].map(ex => (
          <button key={ex} onClick={() => setQuery(ex)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "4px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "border-color .2s,color .2s" }}
            onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textDim; }}>
            {ex}
          </button>
        ))}
      </div>

      {/* Status */}
      {busy && (
        <div style={{ marginTop: 24, padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12 }}>
          <Pulse />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textDim }}>{phaseLabel}</span>
          {demandCount > 0 && <span style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.accent }}>{demandCount} demand expressions found</span>}
        </div>
      )}
      {phase === "synthesizing" && streamText && (
        <div style={{ marginTop: 8, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 100, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent)" }}>{streamText.slice(-400)}</div>
      )}
      {phase === "error" && (
        <div style={{ marginTop: 24, padding: 20, border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6, color: C.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>Analysis failed. Check your connection and try again.</div>
      )}
      {phase === "done" && result && <Results result={result} appData={appData} query={query} competitors={competitors} mode="b2c" onSave={onSave} />}

      {/* History */}
      {history.length > 1 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Recent</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {history.slice(1).map((h, i) => (
              <button key={i} onClick={() => { setQuery(h.query); setCompetitors(h.competitors || []); setResult(h.analysis); setPhase("done"); }} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: h.analysis.opportunityScore >= 70 ? C.green : h.analysis.opportunityScore >= 45 ? C.orange : C.red, fontSize: 10 }}>●</span>
                {h.query} {h.competitors?.length > 0 && <span style={{ color: C.muted }}>+{h.competitors.length}</span>}
                <span style={{ color: C.muted }}>{h.analysis.opportunityScore}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── B2B Panel ──────────────────────────────────────────────────────────────
function B2BPanel({ onSave }) {
  const [query, setQuery] = useState("");
  const [competitors, setCompetitors] = useState([]);
  const [subreddits, setSubreddits] = useState([]);
  const [useCustomOnly, setUseCustomOnly] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [history, setHistory] = useState([]);
  const busy = phase === "fetching" || phase === "synthesizing";

  const run = async () => {
    if (!query.trim() || busy) return;
    setResult(null); setStreamText("");
    try {
      setPhase("fetching");
      setPhaseLabel(`Scanning professional communities${competitors.length > 0 ? ` + ${competitors.length} competitor${competitors.length > 1 ? "s" : ""}` : ""}…`);
      const [redditPosts, demandPosts, ...competitorParts] = await Promise.all([
        fetchB2BRedditSignals(query, subreddits, useCustomOnly),
        fetchRedditDemandSignals(query, subreddits, useCustomOnly),
        ...competitors.map(c => Promise.all([fetchCompetitorData(c), fetchB2BReviewSignals(c)])),
      ]);
      const competitorResults = competitors.map((c, i) => ({ ...(competitorParts[i]?.[0] || {}), reviewSignals: competitorParts[i]?.[1] || [] }));
      const competitorReviews = competitorResults.flatMap(c => c.reviewSignals || []);
      setPhase("synthesizing");
      setPhaseLabel("Synthesizing B2B gap analysis…");
      const analysis = await synthesizeB2B(query, redditPosts, demandPosts, competitorReviews, competitorResults, p => setStreamText(p));
      if (analysis) { setResult(analysis); setHistory(h => [{ query, competitors: [...competitors], analysis }, ...h.slice(0, 4)]); setPhase("done"); }
      else setPhase("error");
    } catch (e) { console.error(e); setPhase("error"); }
  };

  const clear = () => {
    setQuery(""); setCompetitors([]); setSubreddits([]); setUseCustomOnly(false);
    setPhase("idle"); setResult(null); setStreamText("");
  };

  return (
    <div>
      {/* Query */}
      <div style={{ display: "flex", border: `1px solid ${busy ? C.accentB2B : C.borderLit}`, borderRadius: 6, overflow: "hidden", transition: "border-color .3s", boxShadow: busy ? `0 0 0 3px ${C.accentB2B}22` : "none", marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
          placeholder="e.g. HR onboarding, project management, sales ops, devops monitoring…"
          style={{ flex: 1, background: C.surface, border: "none", outline: "none", color: C.text, fontSize: 15, padding: "16px 20px", fontFamily: "'DM Sans', sans-serif" }}/>
        {(phase === "done" || phase === "error") && (
          <button onClick={clear} style={{ background: "none", color: C.muted, border: "none", borderLeft: `1px solid ${C.border}`, cursor: "pointer", padding: "16px 16px", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", transition: "color .2s", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.color = C.red}
            onMouseLeave={e => e.currentTarget.style.color = C.muted}>
            ✕ Clear
          </button>
        )}
        <button onClick={run} disabled={!query.trim() || busy} style={{ background: query.trim() ? C.accentB2B : C.muted, color: query.trim() ? C.bg : C.textDim, border: "none", cursor: query.trim() && !busy ? "pointer" : "default", padding: "16px 28px", fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", transition: "background .2s", whiteSpace: "nowrap" }}>
          {busy ? <Pulse color={C.accentB2B} /> : "Analyze"}
        </button>
      </div>

      {/* Subreddit targeting */}
      <div style={{ marginBottom: 12 }}>
        <ChipInput label="r/ target" placeholder="e.g. sysadmin, devops, humanresources…" items={subreddits} onAdd={s => setSubreddits(p => [...p, s])} onRemove={s => setSubreddits(p => p.filter(x => x !== s))} max={5} accentColor={C.accentB2B} />
        {subreddits.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button onClick={() => setUseCustomOnly(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: useCustomOnly ? C.accentB2B : C.border, transition: "background .2s", position: "relative" }}>
                <div style={{ position: "absolute", top: 3, left: useCustomOnly ? 17 : 3, width: 12, height: 12, borderRadius: "50%", background: useCustomOnly ? C.bg : C.textDim, transition: "left .2s" }}/>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: useCustomOnly ? C.accentB2B : C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {useCustomOnly ? "Custom subs only" : "Custom + default subs"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* B2B Competitors */}
      <div style={{ marginBottom: 12 }}>
        <ChipInput label="+ competitor" placeholder="e.g. Salesforce, HubSpot, Notion, Jira…" items={competitors} onAdd={c => setCompetitors(p => [...p, c])} onRemove={c => setCompetitors(p => p.filter(x => x !== c))} max={5} accentColor={C.accentB2B} />
      </div>

      {/* Quick B2B examples */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["HR onboarding", "sales ops", "devops monitoring", "employee scheduling", "client reporting"].map(ex => (
          <button key={ex} onClick={() => setQuery(ex)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "4px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "border-color .2s,color .2s" }}
            onMouseEnter={e => { e.target.style.borderColor = C.accentB2B; e.target.style.color = C.accentB2B; }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textDim; }}>
            {ex}
          </button>
        ))}
      </div>

      {/* B2B context note */}
      <div style={{ marginTop: 14, padding: "10px 14px", background: `${C.accentB2B}0d`, border: `1px solid ${C.accentB2B}22`, borderRadius: 6, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ color: C.accentB2B, fontSize: 12, flexShrink: 0, marginTop: 1 }}>ℹ</span>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, lineHeight: 1.6 }}>
          B2B mode targets professional communities (r/sysadmin, r/sales, r/humanresources etc.) and frames signals around ICP, GTM motion, and enterprise pain. Add custom subreddits for niche verticals.
        </p>
      </div>

      {/* Status */}
      {busy && (
        <div style={{ marginTop: 24, padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12 }}>
          <Pulse color={C.accentB2B} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textDim }}>{phaseLabel}</span>
        </div>
      )}
      {phase === "synthesizing" && streamText && (
        <div style={{ marginTop: 8, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 100, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent)" }}>{streamText.slice(-400)}</div>
      )}
      {phase === "error" && (
        <div style={{ marginTop: 24, padding: 20, border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6, color: C.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>Analysis failed. Check your connection and try again.</div>
      )}
      {phase === "done" && result && <Results result={result} appData={null} query={query} competitors={competitors} mode="b2b" onSave={onSave} />}

      {/* History */}
      {history.length > 1 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Recent</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {history.slice(1).map((h, i) => (
              <button key={i} onClick={() => { setQuery(h.query); setCompetitors(h.competitors || []); setResult(h.analysis); setPhase("done"); }} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: h.analysis.opportunityScore >= 70 ? C.green : h.analysis.opportunityScore >= 45 ? C.orange : C.red, fontSize: 10 }}>●</span>
                {h.query} {h.competitors?.length > 0 && <span style={{ color: C.muted }}>+{h.competitors.length}</span>}
                <span style={{ color: C.muted }}>{h.analysis.opportunityScore}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Discovery domain config ────────────────────────────────────────────────
const DOMAINS = [
  { id: "health",       label: "Health & Wellness",    emoji: "🏃", context: "personal health tracking, mental wellness, chronic conditions, sleep, nutrition, fitness, meditation, womens health, preventive care" },
  { id: "finance",      label: "Personal Finance",     emoji: "💰", context: "budgeting, debt management, savings goals, investing for beginners, expense tracking, financial anxiety, subscription management, side income" },
  { id: "productivity", label: "Productivity & Work",  emoji: "⚡", context: "task management, ADHD focus tools, deep work, async communication, meeting overload, note-taking, time blocking, digital minimalism" },
  { id: "creator",      label: "Creator Tools",        emoji: "🎨", context: "content creation, video editing, podcasting, social media scheduling, audience growth, monetization, brand building, newsletter tools" },
  { id: "parenting",    label: "Parenting & Family",   emoji: "🧒", context: "baby tracking, child development, family coordination, screen time management, education support, special needs parenting, teen mental health" },
  { id: "travel",       label: "Travel & Adventure",   emoji: "✈️", context: "trip planning, solo travel, digital nomad life, budget travel, visa management, travel safety, sustainable travel, group trip coordination" },
  { id: "food",         label: "Food & Cooking",        emoji: "🍳", context: "meal planning, dietary restrictions, recipe management, grocery optimization, food waste, cooking skill building, restaurant discovery, nutrition tracking" },
  { id: "pets",         label: "Pets & Animals",        emoji: "🐾", context: "pet health tracking, training, veterinary care, pet sitting, senior pet care, exotic pets, multi-pet households, pet loss" },
  { id: "learning",     label: "Learning & Education",  emoji: "📚", context: "skill acquisition, language learning, online courses, self-directed learning, career transition, professional certification, reading habits, memory retention" },
  { id: "home",         label: "Home & Real Estate",    emoji: "🏠", context: "home buying, renting, home maintenance, interior design, decluttering, smart home, moving, home inventory, landlord-tenant" },
];

// ── Discovery: zeitgeist scan across all domains ──────────────────────────
const ALL_DOMAIN_CONTEXT = DOMAINS.map(d => `${d.label}: ${d.context}`).join("\n");

async function synthesizeZeitgeist(onChunk) {
  onChunk("Scanning the zeitgeist…");

  const prompt = `You are a sharp product strategist with deep knowledge of the 2024-2025 app and SaaS landscape. Your job is to identify the hottest unmet needs RIGHT NOW — opportunities that have emerged or intensified in the last 1-2 years due to shifts in behavior, technology, regulation, or culture.

DOMAINS TO CONSIDER:
${ALL_DOMAIN_CONTEXT}

Scan ACROSS ALL DOMAINS and surface the 15 highest-signal opportunities regardless of category. These should feel timely — things that couldn't have been identified the same way 3 years ago.

For each opportunity:
- Account for ALL existing solutions: mobile apps, web apps, SaaS, desktop, AI tools, browser extensions
- Be brutally honest — if Notion, Airtable, ChatGPT, or any known tool covers it well, say so and score low
- Focus on genuine gaps where demand is expressed but supply is fragmented, expensive, or poorly UX'd
- Note which domain it belongs to

Scoring rules:
- 70+: Real gap, clear rising demand, weak/absent solutions
- 45-69: Real demand, meaningful competition exists, differentiation is possible
- Below 45: Saturated or demand too diffuse
- Be conservative — false hope is worse than honest low scores

Return JSON only, no markdown fences:

{
  "scannedAt": "<current year-month e.g. 2025-04>",
  "opportunities": [
    {
      "niche": "<3-6 word specific niche>",
      "domain": "<Health & Wellness|Personal Finance|Productivity & Work|Creator Tools|Parenting & Family|Travel & Adventure|Food & Cooking|Pets & Animals|Learning & Education|Home & Real Estate>",
      "opportunityScore": <0-100>,
      "type": "<improve|whitespace>",
      "demandStrength": "<HIGH|MEDIUM|LOW>",
      "competitionLevel": "<SATURATED|MODERATE|THIN|ABSENT>",
      "trendDriver": "<one sentence: what behavior/tech/culture shift made this emerge now>",
      "knownTools": "<2-4 key existing tools or 'None identified'>",
      "verdict": "<one honest punchy sentence>",
      "signalQuote": "<realistic paraphrase of what frustrated users say>",
      "buildAngle": "<one specific sentence on what to build and how to differentiate>"
    }
  ]
}

Return exactly 15 opportunities ordered by opportunityScore descending. Be specific — "AI-generated content authenticity verification for journalists" beats "content verification".`;

  return streamClaude(prompt, onChunk);
}

async function synthesizeDiscovery(domain, onChunk) {
  onChunk(`Scanning ${domain.label}…`);

  const prompt = `You are a sharp product strategist with deep knowledge of the 2024-2025 app and SaaS landscape. Identify the most compelling unmet needs in the "${domain.label}" space.

DOMAIN CONTEXT: ${domain.context}

For each opportunity:
- Consider ALL existing solutions: mobile apps, web apps, SaaS tools, desktop software, browser extensions, AI tools
- Be brutally honest about competition — if Notion, Airtable, or any well-known tool covers it, say so
- Focus on gaps that are genuinely underserved, not just "nobody built a pretty version of X"
- Favor niches that have emerged or grown significantly in 2023-2025 (new behaviors, new pain points)

Scoring rules:
- 70+: Real gap, clear demand, weak or absent solutions
- 45-69: Real demand but meaningful competition exists, differentiation is possible
- Below 45: Saturated or demand too diffuse
- Be conservative — it's better to score honestly low than give false hope

Return JSON only, no markdown fences:

{
  "opportunities": [
    {
      "niche": "<3-6 word specific niche>",
      "domain": "${domain.label}",
      "opportunityScore": <0-100>,
      "type": "<improve|whitespace>",
      "demandStrength": "<HIGH|MEDIUM|LOW>",
      "competitionLevel": "<SATURATED|MODERATE|THIN|ABSENT>",
      "trendDriver": "<one sentence: what shift made this emerge now>",
      "knownTools": "<2-4 existing tools or 'None identified'>",
      "verdict": "<one honest punchy sentence>",
      "signalQuote": "<realistic paraphrase of what frustrated users say>",
      "buildAngle": "<one specific sentence on what to build and how to differentiate>"
    }
  ]
}

Return exactly 10 opportunities ordered by opportunityScore descending.`;

  return streamClaude(prompt, onChunk);
}



// ── Opportunity row -- must be a real component to use useState ────────────
function OpportunityRow({ opp, index, total, onDiveDeep, onSave, accentDisc, scoreColor, demandColor, compColor }) {
  const [sent, setSent] = useState(false);
  const [savedLocal, setSavedLocal] = useState(false);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 100px 160px",
      gap: 0, padding: "16px 20px",
      borderBottom: index < total - 1 ? `1px solid ${C.border}` : "none",
    }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: scoreColor(opp.opportunityScore), lineHeight: 1, paddingTop: 2 }}>
        {opp.opportunityScore}
      </div>
      <div style={{ paddingRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{opp.niche}</div>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{opp.verdict}</div>
        {opp.knownTools && opp.knownTools !== "None identified" && (
          <div style={{ marginTop: 5, display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted }}>Existing:</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.orange }}>{opp.knownTools}</span>
          </div>
        )}
        {opp.signalQuote && opp.signalQuote !== "No direct signal found" && (
          <div style={{ marginTop: 5, fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, fontStyle: "italic" }}>"{opp.signalQuote.slice(0, 90)}{opp.signalQuote.length > 90 ? "…" : ""}"</div>
        )}
      </div>
      <div style={{ paddingTop: 2 }}>
        <span style={{ display: "inline-block", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, background: opp.type === "whitespace" ? `${C.green}22` : `${C.orange}22`, color: opp.type === "whitespace" ? C.green : C.orange, fontWeight: 700 }}>{opp.type}</span>
      </div>
      <div style={{ paddingTop: 2 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: demandColor(opp.demandStrength), fontWeight: 600 }}>{opp.demandStrength}</span>
      </div>
      <div style={{ paddingTop: 2 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: compColor(opp.competitionLevel), fontWeight: 600 }}>{opp.competitionLevel}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, paddingTop: 1 }}>
        {sent ? (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.green, letterSpacing: "0.1em" }}>✓ Pre-filled B2C</span>
        ) : (
          <button onClick={() => { onDiveDeep(opp.niche); setSent(true); setTimeout(() => setSent(false), 3000); }}
            style={{ background: `${accentDisc}15`, border: `1px solid ${accentDisc}44`, color: accentDisc, cursor: "pointer", padding: "4px 10px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.background = `${accentDisc}30`}
            onMouseLeave={e => e.currentTarget.style.background = `${accentDisc}15`}>
            Dive Deep →
          </button>
        )}
        {savedLocal ? (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#ffd166" }}>🔖 Saved</span>
        ) : (
          <button onClick={() => { onSave(opp, "Discovery"); setSavedLocal(true); }}
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", padding: "4px 10px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", transition: "border-color .2s, color .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#ffd166"; e.currentTarget.style.color = "#ffd166"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
            🔖 Save
          </button>
        )}
      </div>
    </div>
  );
}

// ── Discovery Panel ────────────────────────────────────────────────────────
// ── Discovery Panel ────────────────────────────────────────────────────────
function DiscoveryPanel({ onDiveDeep }) {
  const [mode, setMode] = useState("idle");
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domainFilter, setDomainFilter] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const accentDisc = "#ff6bff";

  const runZeitgeist = async () => {
    setMode("zeitgeist"); setSelectedDomain(null); setDomainFilter(null);
    setResult(null); setStreamText(""); setPage(0); setErrorDetail("");
    try {
      setPhase("synthesizing");
      setPhaseLabel("Scanning the zeitgeist across all domains...");
      const analysis = await synthesizeZeitgeist(p => setStreamText(p));
      if (analysis) {
        setResult(analysis);
        setHistory(h => [{ mode: "zeitgeist", label: "Zeitgeist", emoji: "✨", result: analysis, ts: Date.now() }, ...h.slice(0, 9)]);
        setPhase("done");
      } else { setErrorDetail("Claude returned null."); setPhase("error"); }
    } catch (e) { console.error(e); setErrorDetail(e?.message || String(e)); setPhase("error"); }
  };

  const runDomain = async (domain) => {
    setMode("domain"); setSelectedDomain(domain); setDomainFilter(null);
    setResult(null); setStreamText(""); setPage(0); setErrorDetail("");
    try {
      setPhase("synthesizing");
      setPhaseLabel(`Deep scanning ${domain.label}...`);
      const analysis = await synthesizeDiscovery(domain, p => setStreamText(p));
      if (analysis) {
        setResult(analysis);
        setHistory(h => [{ mode: "domain", label: domain.label, emoji: domain.emoji, result: analysis, ts: Date.now() }, ...h.slice(0, 9)]);
        setPhase("done");
      } else { setErrorDetail("Claude returned null."); setPhase("error"); }
    } catch (e) { console.error(e); setErrorDetail(e?.message || String(e)); setPhase("error"); }
  };

  const clear = () => {
    setMode("idle"); setSelectedDomain(null); setDomainFilter(null);
    setPhase("idle"); setResult(null); setStreamText(""); setPage(0); setErrorDetail("");
  };

  const restoreHistory = (item) => {
    setMode(item.mode);
    setSelectedDomain(item.mode === "domain" ? DOMAINS.find(d => d.label === item.label) : null);
    setDomainFilter(null); setResult(item.result); setPhase("done"); setPage(0);
  };

  const busy = phase === "synthesizing";
  const scoreColor = s => s >= 70 ? C.green : s >= 45 ? C.orange : C.red;
  const demandColor = d => d === "HIGH" ? C.green : d === "MEDIUM" ? C.orange : C.red;
  const compColor = c => c === "ABSENT" || c === "THIN" ? C.green : c === "MODERATE" ? C.orange : C.red;

  const allOpps = result?.opportunities || [];
  const filteredOpps = domainFilter ? allOpps.filter(o => o.domain === domainFilter) : allOpps;
  const totalPages = Math.ceil(filteredOpps.length / PAGE_SIZE);
  const pageOpps = filteredOpps.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const domainCounts = allOpps.reduce((acc, o) => { acc[o.domain] = (acc[o.domain] || 0) + 1; return acc; }, {});

  return (
    <div>
      {/* Zeitgeist CTA */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => !busy && runZeitgeist()} disabled={busy}
          style={{ width: "100%", padding: "22px 32px", background: `${accentDisc}0d`, border: `1px solid ${accentDisc}44`, borderRadius: 10, cursor: busy ? "default" : "pointer", textAlign: "left", transition: "border-color .2s, background .2s" }}
          onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = accentDisc; e.currentTarget.style.background = `${accentDisc}18`; }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor = accentDisc + "44"; e.currentTarget.style.background = `${accentDisc}0d`; }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: accentDisc }}>Scan the Zeitgeist</span>
              </div>
              <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, color: C.text, lineHeight: 1.4 }}>What does the internet want that nobody's built yet — right now, across every domain?</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, marginTop: 6 }}>Returns 15 cross-domain opportunities ranked by signal strength</p>
            </div>
            {busy && mode === "zeitgeist" ? <Pulse color={accentDisc} /> : <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: accentDisc, marginLeft: 24 }}>{busy ? "" : "→"}</div>}
          </div>
        </button>
      </div>

      {/* Domain grid */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Or deep-dive a specific domain</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 8 }}>
          {DOMAINS.map(domain => (
            <button key={domain.id} onClick={() => !busy && runDomain(domain)} disabled={busy}
              style={{ background: selectedDomain?.id === domain.id && phase === "done" ? `${accentDisc}15` : C.surface, border: `1px solid ${selectedDomain?.id === domain.id && phase === "done" ? accentDisc + "55" : C.border}`, borderRadius: 8, padding: "12px 14px", cursor: busy ? "default" : "pointer", textAlign: "left", transition: "border-color .2s, background .2s", opacity: busy && selectedDomain?.id !== domain.id ? 0.35 : 1 }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = accentDisc + "66"; e.currentTarget.style.background = `${accentDisc}0a`; }}}
              onMouseLeave={e => { if (!(selectedDomain?.id === domain.id && phase === "done")) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{domain.emoji}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: selectedDomain?.id === domain.id && phase === "done" ? accentDisc : C.textDim }}>{domain.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {busy && (
        <div style={{ marginTop: 20, padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12 }}>
          <Pulse color={accentDisc} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textDim }}>{phaseLabel}</span>
        </div>
      )}
      {phase === "synthesizing" && streamText && (
        <div style={{ marginTop: 8, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 100, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent)" }}>{streamText.slice(-400)}</div>
      )}
      {phase === "error" && (
        <div style={{ marginTop: 16, padding: 20, border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6, color: C.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          <div>Scan failed. Try again.</div>
          {errorDetail && <div style={{ marginTop: 8, fontSize: 10, color: C.textDim, wordBreak: "break-all" }}>{errorDetail}</div>}
        </div>
      )}

      {/* Results */}
      {phase === "done" && allOpps.length > 0 && (
        <div style={{ marginTop: 24, animation: "fadeUp .5s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accentDisc }}>
                {mode === "zeitgeist" ? `${allOpps.length} Cross-Domain Opportunities` : `${allOpps.length} ${selectedDomain?.label} Opportunities`}
              </h3>
              {totalPages > 1 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>page {page + 1} of {totalPages}</span>}
            </div>
            <button onClick={clear} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", padding: "5px 12px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", transition: "border-color .2s, color .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
              ✕ Clear
            </button>
          </div>

          {/* Domain filter chips — zeitgeist only */}
          {mode === "zeitgeist" && Object.keys(domainCounts).length > 1 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={() => { setDomainFilter(null); setPage(0); }}
                style={{ background: !domainFilter ? accentDisc : C.surface, color: !domainFilter ? C.bg : C.textDim, border: `1px solid ${!domainFilter ? accentDisc : C.border}`, cursor: "pointer", padding: "4px 10px", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                All {allOpps.length}
              </button>
              {Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).map(([domain, count]) => {
                const d = DOMAINS.find(x => x.label === domain);
                return (
                  <button key={domain} onClick={() => { setDomainFilter(domain); setPage(0); }}
                    style={{ background: domainFilter === domain ? `${accentDisc}22` : C.surface, color: domainFilter === domain ? accentDisc : C.textDim, border: `1px solid ${domainFilter === domain ? accentDisc + "55" : C.border}`, cursor: "pointer", padding: "4px 10px", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                    {d?.emoji} {domain.split(" ")[0]} {count}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 100px 130px", gap: 0, padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}>
              {["Score", "Niche + Verdict", "Type", "Demand", "Competition", ""].map((h, i) => (
                <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted }}>{h}</div>
              ))}
            </div>
            {pageOpps.map((opp, i) => (
              <OpportunityRow key={`${page}-${i}`} opp={opp} index={i} total={pageOpps.length}
                onDiveDeep={onDiveDeep} onSave={onSave} accentDisc={accentDisc}
                scoreColor={scoreColor} demandColor={demandColor} compColor={compColor} />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ background: page === 0 ? C.border : C.surface, border: `1px solid ${C.border}`, color: page === 0 ? C.muted : C.text, cursor: page === 0 ? "default" : "pointer", padding: "6px 14px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  style={{ background: page === i ? accentDisc : C.surface, border: `1px solid ${page === i ? accentDisc : C.border}`, color: page === i ? C.bg : C.textDim, cursor: "pointer", padding: "6px 12px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                style={{ background: page === totalPages - 1 ? C.border : C.surface, border: `1px solid ${C.border}`, color: page === totalPages - 1 ? C.muted : C.text, cursor: page === totalPages - 1 ? "default" : "pointer", padding: "6px 14px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Next
              </button>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>{filteredOpps.length} total</span>
            </div>
          )}
          <p style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>Hit "Dive Deep" on any row to pre-fill B2C for a full analysis.</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && !busy && (
        <div style={{ marginTop: 36 }}>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Recent Scans</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {history.map((h, i) => (
              <button key={i} onClick={() => restoreHistory(h)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = accentDisc + "55"}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <span>{h.emoji}</span>
                <span>{h.label}</span>
                <span style={{ color: C.muted }}>{h.result?.opportunities?.length || 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Saved opportunities scratchpad ─────────────────────────────────────────
function exportSavedMarkdown(saved) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const lines = [`# Saved Opportunities\n*Exported ${date} · niche-gap.vercel.app*\n\n---\n`];
  saved.forEach((item, i) => {
    const o = item.opp;
    lines.push(`## ${i + 1}. ${o.niche} · Score: ${o.opportunityScore}`);
    lines.push(`**Source:** ${item.source} · **Saved:** ${new Date(item.savedAt).toLocaleString()}`);
    lines.push(`**Verdict:** ${o.verdict}`);
    if (o.demandStrength) lines.push(`**Demand:** ${o.demandStrength} · **Competition:** ${o.competitionLevel}`);
    if (o.knownTools && o.knownTools !== "None identified") lines.push(`**Known tools:** ${o.knownTools}`);
    if (o.trendDriver) lines.push(`**Trend driver:** ${o.trendDriver}`);
    if (o.buildAngle) lines.push(`**Build angle:** ${o.buildAngle}`);
    if (item.note) lines.push(`**My note:** ${item.note}`);
    lines.push("\n---\n");
  });
  const md = lines.join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saved-opportunities-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function SavedPanel({ saved, onRemove, onNoteChange }) {
  const accentSaved = "#ffd166"; // warm gold
  const scoreColor = s => s >= 70 ? C.green : s >= 45 ? C.orange : C.red;

  if (saved.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔖</div>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: C.textDim, marginBottom: 8 }}>No saved opportunities yet</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, lineHeight: 1.7 }}>
          Hit the bookmark icon on any Discovery row or B2C/B2B result to save it here for later.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accentSaved, marginBottom: 4 }}>
            {saved.length} Saved Opportunit{saved.length === 1 ? "y" : "ies"}
          </h2>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>
            Add notes, then export to markdown to keep permanently.
          </p>
        </div>
        <button onClick={() => exportSavedMarkdown(saved)}
          style={{ background: accentSaved, color: C.bg, border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Export .md
        </button>
      </div>

      {/* Saved items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {saved.map((item, i) => {
          const o = item.opp;
          return (
            <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px", position: "relative" }}>
              {/* Remove button */}
              <button onClick={() => onRemove(item.id)}
                style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 4, transition: "color .2s" }}
                onMouseEnter={e => e.currentTarget.style.color = C.red}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                ×
              </button>

              {/* Top row */}
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: scoreColor(o.opportunityScore), lineHeight: 1, flexShrink: 0 }}>
                  {o.opportunityScore}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{o.niche}</span>
                    {o.type && (
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 2, background: o.type === "whitespace" ? `${C.green}22` : `${C.orange}22`, color: o.type === "whitespace" ? C.green : C.orange, fontWeight: 700 }}>{o.type}</span>
                    )}
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.muted }}>{item.source}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>{o.verdict}</p>
                </div>
              </div>

              {/* Meta row */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                {o.demandStrength && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                    <span style={{ color: C.muted }}>Demand </span>
                    <span style={{ color: o.demandStrength === "HIGH" ? C.green : o.demandStrength === "MEDIUM" ? C.orange : C.red, fontWeight: 700 }}>{o.demandStrength}</span>
                  </div>
                )}
                {o.competitionLevel && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                    <span style={{ color: C.muted }}>Competition </span>
                    <span style={{ color: o.competitionLevel === "ABSENT" || o.competitionLevel === "THIN" ? C.green : o.competitionLevel === "MODERATE" ? C.orange : C.red, fontWeight: 700 }}>{o.competitionLevel}</span>
                  </div>
                )}
                {o.knownTools && o.knownTools !== "None identified" && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                    <span style={{ color: C.muted }}>Tools </span>
                    <span style={{ color: C.orange }}>{o.knownTools}</span>
                  </div>
                )}
              </div>

              {o.buildAngle && o.buildAngle !== "Gap too thin to recommend" && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: `${accentSaved}0d`, border: `1px solid ${accentSaved}22`, borderRadius: 5 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: accentSaved, display: "block", marginBottom: 3 }}>Build angle</span>
                  <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{o.buildAngle}</p>
                </div>
              )}

              {/* Note input */}
              <textarea
                placeholder="Add a personal note… (why it resonated, next steps, ideas)"
                value={item.note || ""}
                onChange={e => onNoteChange(item.id, e.target.value)}
                style={{
                  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 5, color: C.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                  padding: "10px 12px", resize: "vertical", minHeight: 60, outline: "none",
                  lineHeight: 1.6, transition: "border-color .2s",
                }}
                onFocus={e => e.target.style.borderColor = accentSaved}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState("b2c");
  const [b2cPrefill, setB2cPrefill] = useState(null);
  const [saved, setSaved] = useState([]); // [{ id, opp, source, savedAt, note }]

  const handleDiveDeep = (niche) => { setB2cPrefill(niche); };

  const handleSave = (opp, source) => {
    setSaved(s => {
      if (s.find(x => x.opp.niche === opp.niche)) return s; // no dupes
      return [{ id: Date.now(), opp, source, savedAt: Date.now(), note: "" }, ...s];
    });
  };

  const handleRemove = (id) => setSaved(s => s.filter(x => x.id !== id));
  const handleNoteChange = (id, note) => setSaved(s => s.map(x => x.id === id ? { ...x, note } : x));
  const savedCount = saved.length;

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
        <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle,${activeTab === "b2b" ? C.accentB2B : activeTab === "discover" ? "#ff6bff" : activeTab === "saved" ? "#ffd166" : C.accent}18 0%,transparent 70%)`, pointerEvents: "none", zIndex: 0, transition: "background 0.5s" }}/>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 40, animation: "fadeUp .6s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: activeTab === "b2b" ? C.accentB2B : C.accent, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .3s" }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="7" cy="7" r="5" stroke={C.bg} strokeWidth="2"/>
                  <path d="M11 11l4 4" stroke={C.bg} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M7 4v6M4 7h6" stroke={C.bg} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: activeTab === "b2b" ? C.accentB2B : activeTab === "discover" ? "#ff6bff" : C.accent, fontWeight: 500, transition: "color .3s" }}>Niche Gap Analyzer</span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 12 }}>
              Find what people want<br/><em style={{ color: activeTab === "b2b" ? C.accentB2B : activeTab === "discover" ? "#ff6bff" : C.accent, transition: "color .3s" }}>that nobody's built yet.</em>
            </h1>
            <p style={{ color: C.textDim, fontSize: 15, maxWidth: 500, lineHeight: 1.6 }}>
              Validate a niche in B2C or B2B mode, or run Discovery to scan an entire domain for the strongest unmet needs.
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 32, borderBottom: `1px solid ${C.border}` }}>
            {[
              { key: "b2c",      label: "B2C — Consumer Apps",  accent: C.accent,     sub: "App Store · consumer Reddit" },
              { key: "b2b",      label: "B2B — SaaS & Tools",   accent: C.accentB2B,  sub: "Professional communities · enterprise" },
              { key: "discover", label: "Discovery",             accent: "#ff6bff",    sub: "Zeitgeist · domain deep-dive" },
              { key: "saved",    label: "Saved",                 accent: "#ffd166",    sub: savedCount > 0 ? `${savedCount} item${savedCount !== 1 ? "s" : ""}` : "your shortlist" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "12px 24px 14px",
                borderBottom: activeTab === tab.key ? `2px solid ${tab.accent}` : "2px solid transparent",
                marginBottom: -1, transition: "border-color .2s", position: "relative",
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: activeTab === tab.key ? tab.accent : C.muted, transition: "color .2s", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  {tab.label}
                  {tab.key === "saved" && savedCount > 0 && (
                    <span style={{ background: "#ffd166", color: C.bg, borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 6px", lineHeight: 1.4 }}>{savedCount}</span>
                  )}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", color: activeTab === tab.key ? C.textDim : C.muted, textTransform: "uppercase" }}>{tab.sub}</div>
              </button>
            ))}
          </div>

          {/* Active panel — all kept mounted to preserve state */}
          <div style={{ display: activeTab === "b2c" ? "block" : "none" }}>
            <B2CPanel prefill={b2cPrefill} onPrefillConsumed={() => setB2cPrefill(null)} onSave={handleSave} />
          </div>
          <div style={{ display: activeTab === "b2b" ? "block" : "none" }}>
            <B2BPanel onSave={handleSave} />
          </div>
          <div style={{ display: activeTab === "discover" ? "block" : "none" }}>
            <DiscoveryPanel onDiveDeep={handleDiveDeep} onSave={handleSave} />
          </div>
          <div style={{ display: activeTab === "saved" ? "block" : "none" }}>
            <SavedPanel saved={saved} onRemove={handleRemove} onNoteChange={handleNoteChange} />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 60, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>SOURCES: Reddit API · App Store RSS · Claude Synthesis</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>v0.4 · jasonpfields.com</span>
          </div>

        </div>
      </div>
    </>
  );
}
