import { useState } from "react";
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
  const res = await fetch(`/api/reddit?url=${encodeURIComponent(url)}`);
  return res.json();
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
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1400, stream: true, messages: [{ role: "user", content: prompt }] }),
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

// ── Shared results renderer ────────────────────────────────────────────────
function Results({ result, appData, query, competitors, mode }) {
  const accent = mode === "b2b" ? C.accentB2B : C.accent;
  const demandColor = d => d === "HIGH" ? C.green : d === "MEDIUM" ? C.orange : C.red;
  const compColor = c => c === "ABSENT" || c === "THIN" ? C.green : c === "MODERATE" ? C.orange : C.red;

  return (
    <div style={{ marginTop: 40, animation: "fadeUp .5s ease both" }}>

      {/* Export buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
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
function B2CPanel({ prefill, onPrefillConsumed }) {
  const [query, setQuery] = useState("");

  // consume prefill from Discovery dive-deep
  useState(() => { if (prefill) { setQuery(prefill); onPrefillConsumed?.(); } }, [prefill]);
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

  return (
    <div>
      {/* Query */}
      <div style={{ display: "flex", border: `1px solid ${busy ? C.accent : C.borderLit}`, borderRadius: 6, overflow: "hidden", transition: "border-color .3s", boxShadow: busy ? `0 0 0 3px ${C.accent}22` : "none", marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
          placeholder="e.g. meditation, sleep tracking, freelance invoicing…"
          style={{ flex: 1, background: C.surface, border: "none", outline: "none", color: C.text, fontSize: 15, padding: "16px 20px", fontFamily: "'DM Sans', sans-serif" }}/>
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
      {phase === "done" && result && <Results result={result} appData={appData} query={query} competitors={competitors} mode="b2c" />}

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
function B2BPanel() {
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

  return (
    <div>
      {/* Query */}
      <div style={{ display: "flex", border: `1px solid ${busy ? C.accentB2B : C.borderLit}`, borderRadius: 6, overflow: "hidden", transition: "border-color .3s", boxShadow: busy ? `0 0 0 3px ${C.accentB2B}22` : "none", marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
          placeholder="e.g. HR onboarding, project management, sales ops, devops monitoring…"
          style={{ flex: 1, background: C.surface, border: "none", outline: "none", color: C.text, fontSize: 15, padding: "16px 20px", fontFamily: "'DM Sans', sans-serif" }}/>
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
      {phase === "done" && result && <Results result={result} appData={null} query={query} competitors={competitors} mode="b2b" />}

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
  { id: "health",      label: "Health & Wellness",    emoji: "🏃", subs: ["loseit","fitness","mentalhealth","sleep","nutrition","meditation","running","swimming"], appCategory: "Health & Fitness",   queries: ["symptom tracker","mental wellness","sleep aid","chronic illness","workout planner"] },
  { id: "finance",     label: "Personal Finance",     emoji: "💰", subs: ["personalfinance","frugal","financialindependence","investing","povertyfinance","debtfree"], appCategory: "Finance",           queries: ["budget tracker","expense splitting","debt payoff","savings goal","subscription tracker"] },
  { id: "productivity",label: "Productivity & Work",  emoji: "⚡", subs: ["productivity","ADHD","getdisciplined","selfimprovement","nosurf","digitalminimalism"], appCategory: "Productivity",       queries: ["task management","focus timer","habit tracker","note taking","time blocking"] },
  { id: "creator",     label: "Creator Tools",        emoji: "🎨", subs: ["juststart","youtubers","podcasting","content_marketing","NewTubers","graphic_design"], appCategory: "Photo & Video",     queries: ["content calendar","video editing","thumbnail maker","social media scheduler","audience analytics"] },
  { id: "parenting",   label: "Parenting & Family",   emoji: "👨‍👩‍👧", subs: ["Parenting","daddit","Mommit","beyondthebump","SingleParents","autism"], appCategory: "Lifestyle",           queries: ["baby tracker","chore chart","family calendar","screen time","homework helper"] },
  { id: "travel",      label: "Travel & Adventure",   emoji: "✈️", subs: ["travel","solotravel","digitalnomad","backpacking","roadtrip","camping"], appCategory: "Travel",             queries: ["trip planner","packing list","travel budget","visa tracker","offline maps"] },
  { id: "food",        label: "Food & Cooking",        emoji: "🍳", subs: ["MealPrepSunday","EatCheapAndHealthy","recipes","veganrecipes","keto","intermittentfasting"], appCategory: "Food & Drink",    queries: ["meal planner","recipe manager","grocery list","calorie tracker","restaurant finder"] },
  { id: "pets",        label: "Pets & Animals",        emoji: "🐾", subs: ["dogs","cats","puppy101","DogAdvice","AskVet","petadvice"], appCategory: "Lifestyle",           queries: ["pet health tracker","vet reminder","dog training","pet medication","pet sitter"] },
  { id: "learning",    label: "Learning & Education",  emoji: "📚", subs: ["learnprogramming","languagelearning","IWantToLearn","GetStudying","slatestarcodex"], appCategory: "Education",          queries: ["language learning","flashcard maker","study planner","online courses","skill tracker"] },
  { id: "home",        label: "Home & Real Estate",    emoji: "🏠", subs: ["FirstTimeHomeBuyer","HomeImprovement","malelivingspace","femalelivingspace","IKEA","DIY"], appCategory: "Lifestyle",       queries: ["home inventory","rent tracker","home maintenance","interior design","moving checklist"] },
];

const DISCOVERY_PATTERNS = [
  `"I wish there was an app"`,
  `"why isn't there an app"`,
  `"does anyone know a good app"`,
  `"nothing works for"`,
  `"frustrated with" app`,
  `"is there anything that"`,
];

async function runDiscoverySweep(domain, onProgress) {
  const subs = domain.subs.join("+");

  // Fire Reddit searches in parallel -- pattern searches + query searches
  onProgress("Scanning Reddit for pain signals…");
  const patternSearches = DISCOVERY_PATTERNS.slice(0, 4).map(pattern =>
    redditFetch(`https://www.reddit.com/r/${subs}/search.json?q=${encodeURIComponent(pattern)}&sort=relevance&limit=10&restrict_sr=true&t=year`)
      .then(d => (d?.data?.children || []).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 300), score: p.data.score, subreddit: p.data.subreddit })))
      .catch(() => [])
  );

  const querySearches = domain.queries.slice(0, 3).map(q =>
    redditFetch(`https://www.reddit.com/r/${subs}/search.json?q=${encodeURIComponent(q + " problem")}&sort=relevance&limit=8&restrict_sr=true&t=year`)
      .then(d => (d?.data?.children || []).map(p => ({ title: p.data.title, selftext: (p.data.selftext || "").slice(0, 300), score: p.data.score, subreddit: p.data.subreddit })))
      .catch(() => [])
  );

  const allResults = await Promise.all([...patternSearches, ...querySearches]);
  const seen = new Set();
  const posts = allResults.flat()
    .filter(p => { if (seen.has(p.title)) return false; seen.add(p.title); return true; })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  // App Store top apps in category
  onProgress("Pulling App Store category signals…");
  let appReviews = [];
  try {
    for (const q of domain.queries.slice(0, 2)) {
      const s = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=software&limit=3&country=us`).then(r => r.json());
      for (const app of (s?.results || []).slice(0, 2)) {
        const rv = await fetch(`https://itunes.apple.com/rss/customerreviews/page=1/id=${app.trackId}/sortby=mostrecent/json`).then(r => r.json());
        const lowRated = (rv?.feed?.entry || []).slice(1)
          .map(e => ({ app: app.trackName, title: e.title?.label || "", content: e.content?.label || "", rating: parseInt(e["im:rating"]?.label || "3") }))
          .filter(r => r.rating <= 2).slice(0, 4);
        appReviews = [...appReviews, ...lowRated];
      }
    }
  } catch {}

  return { posts, appReviews };
}

async function synthesizeDiscovery(domain, posts, appReviews, onChunk) {
  const redditSummary = posts.slice(0, 25).map(p =>
    `[r/${p.subreddit} ↑${p.score}] "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 150)}` : ""}`
  ).join("\n");

  const reviewSummary = appReviews.slice(0, 15).map(r =>
    `[${r.app}] ★${r.rating} "${r.title}": ${r.content?.slice(0, 150)}`
  ).join("\n");

  const prompt = `You are a sharp product opportunity researcher scanning the "${domain.label}" space for unmet needs.

REDDIT SIGNALS from ${domain.label} communities:
${redditSummary || "No signals found."}

APP STORE LOW-RATED REVIEWS (${domain.label} apps):
${reviewSummary || "No reviews found."}

Identify the 5-7 most compelling unmet needs or opportunity areas — things people are clearly asking for, complaining about, or working around that don't have a good solution yet.

For each opportunity, assess:
- Is this an improvement opportunity (existing bad solutions) or whitespace (nothing exists)?
- How strong is the demand signal?
- How competitive is the space?

Respond JSON only, no markdown:

{
  "opportunities": [
    {
      "niche": "<3-5 word niche name, specific not generic>",
      "opportunityScore": <0-100>,
      "type": "<improve|whitespace>",
      "demandStrength": "<HIGH|MEDIUM|LOW>",
      "competitionLevel": "<SATURATED|MODERATE|THIN|ABSENT>",
      "verdict": "<one punchy sentence — what the opportunity is>",
      "signalQuote": "<most compelling verbatim quote or post title from the data>",
      "buildAngle": "<one specific sentence on what to build or how to differentiate>"
    }
  ]
}

Order by opportunityScore descending. Be specific — "sleep quality during pregnancy" beats "sleep tracking".`;

  return streamClaude(prompt, onChunk);
}

// ── Discovery Panel ────────────────────────────────────────────────────────
function DiscoveryPanel({ onDiveDeep }) {
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState(null);
  const [streamText, setStreamText] = useState("");
  const accentDisc = "#ff6bff"; // magenta for discovery

  const run = async (domain) => {
    setSelectedDomain(domain);
    setResult(null); setStreamText("");
    try {
      setPhase("fetching");
      const { posts, appReviews } = await runDiscoverySweep(domain, label => setPhaseLabel(label));
      setPhase("synthesizing");
      setPhaseLabel(`Identifying opportunities in ${domain.label}…`);
      const analysis = await synthesizeDiscovery(domain, posts, appReviews, p => setStreamText(p));
      if (analysis) { setResult(analysis); setPhase("done"); }
      else setPhase("error");
    } catch (e) { console.error(e); setPhase("error"); }
  };

  const busy = phase === "fetching" || phase === "synthesizing";
  const scoreColor = s => s >= 70 ? C.green : s >= 45 ? C.orange : C.red;
  const demandColor = d => d === "HIGH" ? C.green : d === "MEDIUM" ? C.orange : C.red;
  const compColor = c => c === "ABSENT" || c === "THIN" ? C.green : c === "MODERATE" ? C.orange : C.red;

  return (
    <div>
      {/* Context note */}
      <div style={{ marginBottom: 24, padding: "14px 18px", background: `${accentDisc}0d`, border: `1px solid ${accentDisc}22`, borderRadius: 8 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, lineHeight: 1.7, letterSpacing: "0.05em" }}>
          Pick a domain to scan. Discovery runs a broad sweep across domain-specific subreddits and App Store reviews, then surfaces the top opportunities ranked by signal strength. Click any row to dive deep in B2C or B2B mode.
        </p>
      </div>

      {/* Domain grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 28 }}>
        {DOMAINS.map(domain => (
          <button key={domain.id} onClick={() => !busy && run(domain)}
            disabled={busy}
            style={{
              background: selectedDomain?.id === domain.id ? `${accentDisc}15` : C.surface,
              border: `1px solid ${selectedDomain?.id === domain.id ? accentDisc + "66" : C.border}`,
              borderRadius: 8, padding: "14px 16px", cursor: busy ? "default" : "pointer",
              textAlign: "left", transition: "border-color .2s, background .2s",
              opacity: busy && selectedDomain?.id !== domain.id ? 0.4 : 1,
            }}
            onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = accentDisc + "88"; e.currentTarget.style.background = `${accentDisc}0d`; }}}
            onMouseLeave={e => { if (selectedDomain?.id !== domain.id) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{domain.emoji}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: selectedDomain?.id === domain.id ? accentDisc : C.textDim, marginBottom: 4 }}>{domain.label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.muted }}>{domain.subs.slice(0,3).map(s => `r/${s}`).join(" · ")}</div>
          </button>
        ))}
      </div>

      {/* Status */}
      {busy && (
        <div style={{ marginBottom: 16, padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12 }}>
          <Pulse color={accentDisc} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textDim }}>{phaseLabel}</span>
        </div>
      )}
      {phase === "synthesizing" && streamText && (
        <div style={{ marginBottom: 12, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 100, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent)" }}>{streamText.slice(-400)}</div>
      )}
      {phase === "error" && (
        <div style={{ padding: 20, border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6, color: C.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>Sweep failed. Check your connection and try again.</div>
      )}

      {/* Results table */}
      {phase === "done" && result?.opportunities?.length > 0 && (
        <div style={{ animation: "fadeUp .5s ease both" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accentDisc }}>
              {result.opportunities.length} Opportunities Found
            </h3>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>— {selectedDomain?.label} · click any row to dive deep</span>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 100px 80px 32px", gap: 0, padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}>
              {["Score", "Niche + Verdict", "Type", "Demand", "Competition", "Build Angle", ""].map((h, i) => (
                <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted }}>{h}</div>
              ))}
            </div>

            {/* Table rows */}
            {result.opportunities.map((opp, i) => (
              <div key={i}
                onClick={() => onDiveDeep(opp.niche, opp.competitionLevel === "SATURATED" || opp.competitionLevel === "MODERATE" ? "b2c" : "b2c")}
                style={{
                  display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 100px 80px 32px",
                  gap: 0, padding: "16px 20px",
                  borderBottom: i < result.opportunities.length - 1 ? `1px solid ${C.border}` : "none",
                  cursor: "pointer", transition: "background .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${accentDisc}08`}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                {/* Score */}
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: scoreColor(opp.opportunityScore), lineHeight: 1, paddingTop: 2 }}>
                  {opp.opportunityScore}
                </div>

                {/* Niche + verdict */}
                <div style={{ paddingRight: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{opp.niche}</div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{opp.verdict}</div>
                  {opp.signalQuote && (
                    <div style={{ marginTop: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, fontStyle: "italic" }}>"{opp.signalQuote.slice(0, 80)}…"</div>
                  )}
                </div>

                {/* Type */}
                <div>
                  <span style={{
                    display: "inline-block", fontFamily: "'DM Mono', monospace", fontSize: 9,
                    letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2,
                    background: opp.type === "whitespace" ? `${C.green}22` : `${C.orange}22`,
                    color: opp.type === "whitespace" ? C.green : C.orange, fontWeight: 700,
                  }}>{opp.type}</span>
                </div>

                {/* Demand */}
                <div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: demandColor(opp.demandStrength), fontWeight: 600 }}>
                    {opp.demandStrength}
                  </span>
                </div>

                {/* Competition */}
                <div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: compColor(opp.competitionLevel), fontWeight: 600 }}>
                    {opp.competitionLevel}
                  </span>
                </div>

                {/* Build angle */}
                <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4, paddingRight: 8 }}>
                  {opp.buildAngle?.slice(0, 60)}{opp.buildAngle?.length > 60 ? "…" : ""}
                </div>

                {/* Arrow */}
                <div style={{ color: accentDisc, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>→</div>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>
            Click any row to pre-fill the B2C or B2B tab for a full deep-dive analysis.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState("b2c");
  const [b2cPrefill, setB2cPrefill] = useState(null);

  const handleDiveDeep = (niche, mode) => {
    setB2cPrefill(niche);
    setActiveTab(mode || "b2c");
  };

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
        <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle,${activeTab === "b2b" ? C.accentB2B : activeTab === "discover" ? "#ff6bff" : C.accent}18 0%,transparent 70%)`, pointerEvents: "none", zIndex: 0, transition: "background 0.5s" }}/>

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
              { key: "discover", label: "Discovery",             accent: "#ff6bff",    sub: "Scan a domain · find opportunities" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "12px 24px 14px",
                borderBottom: activeTab === tab.key ? `2px solid ${tab.accent}` : "2px solid transparent",
                marginBottom: -1, transition: "border-color .2s",
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: activeTab === tab.key ? tab.accent : C.muted, transition: "color .2s", marginBottom: 3 }}>{tab.label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", color: activeTab === tab.key ? C.textDim : C.muted, textTransform: "uppercase" }}>{tab.sub}</div>
              </button>
            ))}
          </div>

          {/* Active panel */}
          {activeTab === "b2c" && <B2CPanel prefill={b2cPrefill} onPrefillConsumed={() => setB2cPrefill(null)} />}
          {activeTab === "b2b" && <B2BPanel />}
          {activeTab === "discover" && <DiscoveryPanel onDiveDeep={handleDiveDeep} />}

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
