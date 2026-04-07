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

// Print HTML via a hidden iframe so the user never leaves the current page,
// no popup is opened, and there's no blob: URL that Chrome can collect mid-print.
function printHTMLViaIframe(html, filename) {
  // Clean up any leftover iframe from a previous run
  const old = document.getElementById("nga-print-frame");
  if (old) old.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "nga-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  // Set a title so the saved PDF defaults to a useful filename
  const titledHtml = filename
    ? html.replace(/<title>[^<]*<\/title>/, `<title>${filename}</title>`)
    : html;
  doc.open();
  doc.write(titledHtml);
  doc.close();

  // Wait for fonts + layout, then trigger print. Fonts API gives us a clean signal.
  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error("[printHTMLViaIframe] print failed:", e);
    }
    // Remove the iframe after the print dialog closes (afterprint fires on save or cancel)
    const cleanup = () => { setTimeout(() => iframe.remove(), 500); };
    iframe.contentWindow.addEventListener("afterprint", cleanup, { once: true });
    // Safety net — clean up after 60s even if afterprint never fires
    setTimeout(() => { if (document.getElementById("nga-print-frame") === iframe) iframe.remove(); }, 60000);
  };

  // Give the iframe a moment to parse and load fonts before printing
  if (iframe.contentDocument && iframe.contentDocument.fonts && iframe.contentDocument.fonts.ready) {
    iframe.contentDocument.fonts.ready.then(() => setTimeout(triggerPrint, 150));
  } else {
    setTimeout(triggerPrint, 600);
  }
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

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Niche Gap Report: ${query}</title><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0b;color:#e2e2e8;font-family:'DM Sans',sans-serif;max-width:860px;margin:0 auto;padding:48px 32px 80px}h1{font-family:'Instrument Serif',serif;font-size:40px;font-weight:400;line-height:1.1;margin-bottom:8px}h1 em{color:${accentHex};font-style:italic}h2{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8888a0;margin-bottom:16px}section{background:#111114;border:1px solid #1e1e24;border-radius:8px;padding:24px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#4a4a5a;text-align:left;padding:0 12px 10px 0}td{padding:10px 12px 10px 0;color:#8888a0;border-top:1px solid #1e1e24;vertical-align:top}td:first-child{color:#e2e2e8}.serif{font-family:'Instrument Serif',serif}.italic{font-style:italic}.meta{font-family:'DM Mono',monospace;font-size:11px;color:#4a4a5a;margin-bottom:24px}.score-row{display:flex;align-items:center;gap:24px}.score-num{font-family:'DM Mono',monospace;font-size:52px;font-weight:700;color:${scoreColor};line-height:1}.verdict{font-family:'Instrument Serif',serif;font-size:24px;line-height:1.3;flex:1;color:#e2e2e8}.subscore-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:20px}.subscore{padding:12px 14px;background:#0a0a0b;border:1px solid #1e1e24;border-radius:6px}.subscore-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}.subscore-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#4a4a5a}.subscore-value{font-family:'DM Mono',monospace;font-size:16px;font-weight:700}.subscore-bar{width:100%;height:4px;background:#1e1e24;border-radius:2px;overflow:hidden;margin-bottom:6px}.subscore-bar div{height:100%}.subscore-hint{font-family:'DM Mono',monospace;font-size:9px;color:#4a4a5a}.tags{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}.tag{display:inline-block;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0b;padding:2px 8px;border-radius:2px;font-weight:700}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.theme{margin-bottom:14px}.theme-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.phrases{display:flex;flex-wrap:wrap;gap:4px}.phrase{font-family:'DM Mono',monospace;font-size:11px;color:#8888a0;background:#1e1e24;padding:2px 7px;border-radius:2px}.feature{display:flex;gap:10px;margin-bottom:10px;font-size:13px;line-height:1.5}.arrow{color:${accentHex}}.callout{padding:14px 18px;border-radius:6px;margin-top:16px}.callout.accent{background:rgba(124,111,255,0.07);border:1px solid rgba(124,111,255,0.2)}.callout.orange{background:rgba(255,171,71,0.07);border:1px solid rgba(255,171,71,0.2)}.label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;display:block;margin-bottom:6px;color:${accentHex}}.callout.orange .label{color:#ffab47}.quote-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.quote-card{padding:12px 14px;background:#0a0a0b;border-radius:6px}.quote-card.seeking{border:1px solid rgba(232,255,71,0.2)}.quote-card.lamenting{border:1px solid rgba(255,171,71,0.2)}.quote-meta{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px}.quote-card.seeking .quote-meta{color:#e8ff47}.quote-card.lamenting .quote-meta{color:#ffab47}.quote-card p{font-size:14px;line-height:1.5;color:#e2e2e8}.risk{display:flex;gap:10px;margin-bottom:8px;font-size:13px;color:#8888a0;line-height:1.6}.footer{font-family:'DM Mono',monospace;font-size:10px;color:#4a4a5a;display:flex;justify-content:space-between;margin-top:32px;padding-top:20px;border-top:1px solid #1e1e24}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@media print{@page{size:A4;margin:14mm}html,body{background:#ffffff!important;color:#1a1a1f!important}body{padding:0!important;max-width:none!important}button{display:none!important}h1{color:#0a0a0b!important}h2{color:#555566!important}section{background:#ffffff!important;border:1px solid #d8d8de!important;break-inside:avoid;page-break-inside:avoid;margin-bottom:12px!important}.meta,.footer{color:#666677!important}.footer{border-top:1px solid #d8d8de!important}td{color:#333344!important;border-top:1px solid #e4e4ec!important}td:first-child{color:#0a0a0b!important}th{color:#777788!important}.theme,.feature,.risk{color:#333344!important}.theme-head span:first-child{color:#0a0a0b!important}.phrase{background:#f0f0f5!important;color:#444455!important}.quote-card{background:#fafafc!important}.quote-card p{color:#1a1a1f!important}.callout.accent{background:#f4f3ff!important;border-color:#cfc8ff!important}.callout.orange{background:#fff6e8!important;border-color:#ffd9a8!important}.verdict,.serif{color:#0a0a0b!important}.score-num{text-shadow:none!important}.tag{color:#0a0a0b!important}.subscore{background:#fafafc!important;border:1px solid #d8d8de!important}.subscore-label,.subscore-hint{color:#666677!important}.subscore-bar{background:#e4e4ec!important}}</style></head><body><div style="margin-bottom:40px"><div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${accentHex};margin-bottom:14px">Niche Gap Analyzer · ${mode.toUpperCase()}</div><h1>Gap Report:<br/><em>${query}</em></h1><p class="meta">${date}${competitors?.length > 0 ? ` · Competitors: ${competitors.join(", ")}` : ""}</p><button onclick="window.print()" style="background:${accentHex};color:#0a0a0b;border:none;cursor:pointer;padding:10px 20px;font-family:'DM Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px">Save as PDF</button></div><section><div class="score-row"><div class="score-num">${result.opportunityScore}</div><div style="flex:1"><div class="tags"><span class="tag" style="background:${demandColor}">Demand: ${result.demandStrength}</span><span class="tag" style="background:${compColor}">Competition: ${result.competitionLevel}</span>${result.signalConfidence ? `<span class="tag" style="background:${result.signalConfidence === "HIGH" ? "#47ffb2" : result.signalConfidence === "MEDIUM" ? "#ffab47" : "#ff4d4d"}">Signal: ${result.signalConfidence}</span>` : ""}${appData ? `<span class="tag" style="background:#4a4a5a">${appData.name}</span>` : ""}</div><p class="verdict">${result.verdict}</p></div></div>${result.professionalNicheWarning ? `<div class="callout orange" style="margin-top:18px"><span class="label">⚠ Professional Niche Detected</span><p style="font-size:13px;line-height:1.5">${result.professionalNicheWarning}</p></div>` : ""}${(typeof result.demandScore === "number" || typeof result.competitionScore === "number" || typeof result.timingScore === "number") ? `<div class="subscore-grid">${[{label:"Demand",value:result.demandScore,hint:"pain × volume"},{label:"Competition",value:result.competitionScore,hint:"higher = more whitespace"},{label:"Timing",value:result.timingScore,hint:"trend direction"}].map(s => { const v = typeof s.value === "number" ? s.value : 0; const c = v >= 70 ? "#47ffb2" : v >= 40 ? "#ffab47" : "#ff4d4d"; return `<div class="subscore"><div class="subscore-head"><span class="subscore-label">${s.label}</span><span class="subscore-value" style="color:${c}">${typeof s.value === "number" ? s.value : "—"}</span></div><div class="subscore-bar"><div style="width:${v}%;background:${c}"></div></div><div class="subscore-hint">${s.hint}</div></div>`; }).join("")}</div>` : ""}</section>${matrixHTML}<div class="grid-2"><section><h2>Top Pain Themes</h2>${result.topPainThemes?.map(t => { const tc = t.frequency === "HIGH" ? "#ff4d4d" : t.frequency === "MED" ? "#ffab47" : "#4a4a5a"; return `<div class="theme"><div class="theme-head"><span style="font-size:13px;font-weight:600">${t.theme}</span><span class="tag" style="background:${tc}">${t.frequency}</span></div><div class="phrases">${t.exactPhrases?.map(p => `<span class="phrase">"${p}"</span>`).join("") || ""}</div></div>`; }).join("") || ""}</section><section><h2>Missing Features</h2>${result.missingFeatures?.map(f => `<div class="feature"><span class="arrow">→</span><span>${f}</span></div>`).join("") || ""}<hr style="border:none;border-top:1px solid #1e1e24;margin:16px 0"/><h2>Target</h2><p style="font-size:13px;color:#8888a0;line-height:1.6">${result.targetAudience}</p></section></div>${demandHTML}${b2bHTML}<div class="grid-2"><section><h2>Positioning Angle</h2><div class="callout accent"><p class="serif italic">"${result.positioningAngle}"</p></div></section><section><h2>Build Recommendation</h2><p style="font-size:13px;line-height:1.6">${result.buildRecommendation}</p></section></div><div class="grid-2"><section><h2>Signal</h2><p style="font-size:13px;color:#8888a0;line-height:1.7;font-style:italic">"${result.redditInsight}"</p></section><section style="border-color:rgba(255,77,77,0.2)"><h2 style="color:#ff4d4d">Risks</h2>${result.warnings?.map(w => `<div class="risk"><span style="color:#ff4d4d">⚠</span><span>${w}</span></div>`).join("") || ""}</section></div><div class="footer"><span>SOURCES: Reddit API · ${mode === "b2b" ? "G2/Capterra · LinkedIn" : "App Store RSS"} · Claude Synthesis</span><span>© ${new Date().getFullYear()} jasonpfields.com · niche-gap.vercel.app</span></div></body></html>`;

  printHTMLViaIframe(html, `Niche Gap Report — ${query}`);
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

// ── Competitive Landscape Map — deep side-by-side analysis ────────────────
async function synthesizeCompetitiveLandscape(space, competitors, competitorData, onChunk) {
  const competitorSection = competitorData.map(c => {
    if (!c.appInfo) return `${c.appName}: Not found on App Store.`;
    const reviews = c.lowReviews.map(r => `  ★${r.rating} "${r.title}": ${r.content?.slice(0,150)}`).join("\n") || "  No low-rated reviews.";
    const mentions = c.mentions.map(m => `  [r/${m.subreddit} ↑${m.score}] "${m.title}"`).join("\n") || "  No Reddit mentions.";
    return `${c.appInfo.name} by ${c.appInfo.developer}
  Rating: ★${c.appInfo.rating?.toFixed(1)} from ${c.appInfo.reviewCount?.toLocaleString()} reviews
  Price: ${c.appInfo.price || "Free"} · Category: ${c.appInfo.category}
  Low-rated reviews:\n${reviews}
  Reddit mentions:\n${mentions}`;
  }).join("\n\n");

  const prompt = `You are a sharp product strategist building a competitive landscape map for the "${space}" space.

COMPETITOR DATA:
${competitorSection}

Produce a thorough competitive landscape analysis. For each competitor extract real signal from the review and Reddit data. Then identify the shared whitespace — what ALL of them fail to do well.

Respond JSON only, no markdown:

{
  "space": "${space}",
  "landscapeSummary": "<2-3 sentence overview of the competitive dynamics in this space>",
  "competitors": [
    {
      "name": "<app name>",
      "rating": <number>,
      "reviewCount": <number>,
      "price": "<price or Free>",
      "strengthSummary": "<what they do genuinely well — be specific>",
      "topComplaints": ["<complaint 1>", "<complaint 2>", "<complaint 3>"],
      "missingFeatures": ["<feature 1>", "<feature 2>"],
      "userSentiment": "<POSITIVE|MIXED|NEGATIVE>",
      "vulnerabilityScore": <0-100>,
      "targetUser": "<who this app is really built for>"
    }
  ],
  "sharedWeaknesses": ["<weakness all share 1>", "<weakness all share 2>", "<weakness all share 3>"],
  "whitespaceOpportunity": "<the single most compelling gap that none of them solve — be specific and actionable>",
  "winningAngle": "<if you were building a competitor, what would you do differently to beat all of them>",
  "marketMaturity": "<EMERGING|GROWING|MATURE|SATURATED>",
  "priceGap": "<is there a pricing tier nobody is serving well? describe it or say 'None identified'>",
  "recommendedPositioning": "<one-liner positioning statement for a new entrant>"
}`;

  return streamClaude(prompt, onChunk, 5000);
}


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

  const redditCount = (redditPosts?.length || 0) + (demandPosts?.length || 0);
  const signalHint = redditCount < 5 ? "SIGNAL HINT: Very few Reddit posts were found — this may be a professional/institutional niche where demand doesn't live on Reddit. Set signalConfidence to LOW and populate professionalNicheWarning." : redditCount < 12 ? "SIGNAL HINT: Reddit signal is thin. Consider MEDIUM confidence." : "SIGNAL HINT: Reddit signal is adequate.";

  const prompt = `You are a sharp product strategist. Analyze B2C signals for: "${query}"\n\nAPP STORE (auto-detected): ${appInfo}\nLOW-RATED REVIEWS: ${reviewSummary || "None."}\n${competitorSection}\nREDDIT — GENERAL: ${redditSummary || "None."}\nREDDIT — RAW DEMAND: ${demandSummary || "None."}\n\n${signalHint}\n\nWeight RAW DEMAND most heavily. ${competitorData.length > 0 ? "For NAMED COMPETITORS: gaps ALL fail to solve = highest-value whitespace." : ""}\n\nScoring rubric — be decisive and use the full 0-100 range, not just 25/50/75:\n- demandScore: intensity AND volume of pain/seeking signals. 80+ = many loud voices. 40-60 = some signal but tepid. <30 = crickets.\n- competitionScore: INVERSE of saturation — HIGHER score = MORE opportunity. 80+ = whitespace or weak incumbents. 40-60 = moderate competition with cracks. <30 = saturated with strong incumbents.\n- timingScore: is the trend accelerating or stagnant? 80+ = clearly accelerating demand. 50 = steady. <30 = shrinking or niche-of-a-niche.\n- opportunityScore: weighted composite roughly (demand*0.4 + competition*0.35 + timing*0.25).\n- signalConfidence: HIGH if rich Reddit + reviews, MEDIUM if limited, LOW if barely any organic signal found (likely professional niche).\n- professionalNicheWarning: string or null. If signal is LOW because the audience doesn't post on Reddit (CRNAs, surgeons, enterprise buyers, first responders, etc.), return a 1-sentence warning pointing to where demand actually lives (LinkedIn groups / professional associations / conference proceedings). Otherwise null.\n\nRespond JSON only, no markdown:\n\n{"opportunityScore":<0-100>,"demandScore":<0-100>,"competitionScore":<0-100>,"timingScore":<0-100>,"signalConfidence":"<HIGH|MEDIUM|LOW>","professionalNicheWarning":<string or null>,"verdict":"<punchy one-sentence headline — the takeaway a founder would quote>","demandStrength":"<HIGH|MEDIUM|LOW>","competitionLevel":"<SATURATED|MODERATE|THIN|ABSENT>","topPainThemes":[{"theme":"<n>","frequency":"<HIGH|MED|LOW>","exactPhrases":["<p1>","<p2>"]}],"missingFeatures":["<f1>","<f2>","<f3>"],"positioningAngle":"<one-liner>","targetAudience":"<specific>","redditInsight":"<most revealing>","demandQuotes":[{"quote":"<verbatim>","type":"<seeking|lamenting>","upvotes":<n>}],"competitorMatrix":[{"name":"<app>","rating":<n>,"topComplaint":"<complaint>","missingFeature":"<feature>","pricePoint":"<price>","weaknessScore":<0-100>}],"sharedWeakness":"<gap ALL fail to solve>","buildRecommendation":"<1-2 features>","warnings":["<r1>","<r2>"]}`;

  return streamClaude(prompt, onChunk);
}

// ── Claude synthesis — B2B ─────────────────────────────────────────────────
async function synthesizeB2B(query, redditPosts, demandPosts, competitorReviews, competitorData, onChunk) {
  const redditSummary = redditPosts.slice(0, 10).map(p => `[r/${p.subreddit}] "${p.title}" — ${p.selftext?.slice(0, 200) || "no body"}`).join("\n");
  const demandSummary = demandPosts.slice(0, 10).map(p => `[r/${p.subreddit} · ↑${p.score}] "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 200)}` : ""}`).join("\n");
  const reviewSummary = competitorReviews.map(r => `[${r.subreddit}] "${r.title}": ${r.selftext?.slice(0,200)}`).join("\n");
  const competitorSection = competitorData.length > 0 ? `\nNAMED B2B COMPETITORS:\n${competitorData.map(c => { if (!c.appInfo) return `${c.appName}: Not found on App Store (may be web-only B2B tool).`; const reviews = c.lowReviews.map(r => `  ★${r.rating} "${r.title}": ${r.content?.slice(0,150)}`).join("\n") || "  No low-rated reviews."; const mentions = c.mentions.map(m => `  [r/${m.subreddit} ↑${m.score}] "${m.title}"`).join("\n") || "  No Reddit mentions."; return `${c.appInfo.name} — ★${c.appInfo.rating?.toFixed(1)} · ${c.appInfo.price || "Free"}\n  Reviews:\n${reviews}\n  Mentions:\n${mentions}`; }).join("\n\n")}` : "";

  const b2bSignalCount = (redditPosts?.length || 0) + (demandPosts?.length || 0);
  const b2bSignalHint = b2bSignalCount < 5 ? "SIGNAL HINT: Very few Reddit posts found — B2B buyers often don't talk on Reddit. Set signalConfidence to LOW and populate professionalNicheWarning pointing to G2/Capterra/LinkedIn groups/industry conferences." : b2bSignalCount < 12 ? "SIGNAL HINT: Reddit signal is thin for this B2B query — consider MEDIUM confidence." : "SIGNAL HINT: Reddit signal is adequate.";

  const prompt = `You are a B2B SaaS product strategist. Analyze enterprise/professional signals for: "${query}"\n\nREDDIT — PROFESSIONAL COMMUNITIES: ${redditSummary || "None."}\nREDDIT — DEMAND SIGNALS: ${demandSummary || "None."}\nCOMPETITOR COMPLAINT SIGNALS: ${reviewSummary || "None."}\n${competitorSection}\n\n${b2bSignalHint}\n\nFocus on: workflow pain, integration gaps, pricing complaints, onboarding friction, missing enterprise features, buyer vs user misalignment. Think in terms of ICP, GTM motion, and willingness to pay.\n\nScoring rubric — be decisive and use the full 0-100 range:\n- demandScore: intensity AND volume of professional pain signals. 80+ = loud, repeated pain. <30 = crickets.\n- competitionScore: INVERSE of saturation — HIGHER score = MORE opportunity. 80+ = whitespace or weak incumbents. <30 = saturated enterprise space with entrenched incumbents.\n- timingScore: trend direction. 80+ = clearly accelerating (new regulation, shifting workflow). 50 = steady. <30 = stagnant category.\n- opportunityScore: weighted composite (demand*0.4 + competition*0.35 + timing*0.25).\n- signalConfidence: HIGH if rich professional signal, MEDIUM if thin, LOW if barely any (typical for regulated/enterprise niches).\n- professionalNicheWarning: string or null. If signal is LOW because buyers live in G2/Capterra/LinkedIn groups/industry conferences rather than Reddit, return a 1-sentence warning pointing there. Otherwise null.\n\nRespond JSON only, no markdown:\n\n{"opportunityScore":<0-100>,"demandScore":<0-100>,"competitionScore":<0-100>,"timingScore":<0-100>,"signalConfidence":"<HIGH|MEDIUM|LOW>","professionalNicheWarning":<string or null>,"verdict":"<punchy one-sentence headline>","demandStrength":"<HIGH|MEDIUM|LOW>","competitionLevel":"<SATURATED|MODERATE|THIN|ABSENT>","topPainThemes":[{"theme":"<n>","frequency":"<HIGH|MED|LOW>","exactPhrases":["<p1>","<p2>"]}],"missingFeatures":["<f1>","<f2>","<f3>"],"positioningAngle":"<one-liner>","targetAudience":"<specific job title / company type>","redditInsight":"<most revealing signal>","demandQuotes":[{"quote":"<verbatim>","type":"<seeking|lamenting>","upvotes":<n>}],"competitorMatrix":[{"name":"<tool>","rating":<n>,"topComplaint":"<enterprise complaint>","missingFeature":"<missing feature>","pricePoint":"<pricing>","weaknessScore":<0-100>}],"sharedWeakness":"<gap ALL fail to solve>","icp":"<ideal customer profile — role, company size, industry>","gtmMotion":"<recommended GTM — PLG / sales-led / community-led>","buyerInsights":"<2-3 sentences on buyer psychology and what makes them switch>","buildRecommendation":"<1-2 features that would win enterprise deals>","warnings":["<r1>","<r2>"]}`;

  return streamClaude(prompt, onChunk);
}

async function streamClaude(prompt, onChunk, maxTokens = 5000) {
  // Strip surrogate pairs and other problematic Unicode that breaks JSON encoding
  const safePrompt = prompt.replace(/[\uD800-\uDFFF]/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, stream: true, messages: [{ role: "user", content: safePrompt }] }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`Claude API ${response.status}: ${errText.slice(0, 200)}`);
  }

  let fullText = "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Stream-safe decode + line buffering. SSE events can split across reads,
    // so we keep the trailing partial line in `buffer` until a newline arrives.
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // last element is the (possibly incomplete) trailing line
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        if (j.type === "content_block_delta") {
          fullText += j.delta?.text || "";
          onChunk(fullText);
        }
      } catch {}
    }
  }
  // Flush any final buffered line
  if (buffer.startsWith("data: ")) {
    try {
      const j = JSON.parse(buffer.slice(6));
      if (j.type === "content_block_delta") fullText += j.delta?.text || "";
    } catch {}
  }
  // Strip code fences if present
  let cleaned = fullText.replace(/```json|```/g, "").trim();

  // Quick path: try parsing as-is
  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    // Salvage path: if the response was truncated mid-array, try to close it cleanly.
    // Strategy: walk back to the last `},` (end of a complete object inside an array),
    // then close all unbalanced `[` and `{` in order.
    const openBraces = (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length - (cleaned.match(/\]/g) || []).length;
    if (openBraces > 0 || openBrackets > 0) {
      const lastGoodBrace = cleaned.lastIndexOf("},");
      if (lastGoodBrace > 0) {
        const truncated = cleaned.slice(0, lastGoodBrace + 1) + "]".repeat(Math.max(0, openBrackets)) + "}".repeat(Math.max(0, openBraces));
        try { return JSON.parse(truncated); } catch {}
      }
    }
    // Give the user (and console) something actually debuggable.
    console.error("[streamClaude] JSON parse failed.\n  error:", firstErr.message, "\n  length:", fullText.length, "\n  head:", fullText.slice(0, 300), "\n  tail:", fullText.slice(-300));
    const head = cleaned.slice(0, 240).replace(/\s+/g, " ");
    throw new Error(`JSON parse failed: ${firstErr.message}\n\nResponse head: ${head}${cleaned.length > 240 ? "…" : ""}\n\n(Full response logged to browser console.)`);
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
        <button type="button" onClick={(e) => {
          e.preventDefault();
          if (!onSave) return;
          try {
            onSave({
              niche: query || "Untitled",
              opportunityScore: result?.opportunityScore ?? 0,
              type: result?.competitionLevel === "ABSENT" || result?.competitionLevel === "THIN" ? "whitespace" : "improve",
              demandStrength: result?.demandStrength,
              competitionLevel: result?.competitionLevel,
              verdict: result?.verdict || "",
              knownTools: result?.competitorMatrix?.map(c => c.name).filter(Boolean).join(", ") || "None identified",
              buildAngle: result?.buildRecommendation || "",
            }, mode === "b2b" ? "B2B" : "B2C");
          } catch (err) { console.error("[Save click] failed:", err); }
        }}
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

      {/* Score + verdict headline */}
      <div style={{ display: "flex", gap: 24, alignItems: "center", padding: "28px 32px", background: C.surface, border: `1px solid ${C.borderLit}`, borderRadius: 8, marginBottom: 16 }}>
        <ScoreRing score={result.opportunityScore} size={96} accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <Tag label={`Demand: ${result.demandStrength}`} color={demandColor(result.demandStrength)} />
            <Tag label={`Competition: ${result.competitionLevel}`} color={compColor(result.competitionLevel)} />
            {result.signalConfidence && <Tag label={`Signal: ${result.signalConfidence}`} color={result.signalConfidence === "HIGH" ? C.green : result.signalConfidence === "MEDIUM" ? C.orange : C.red} />}
            {appData && <Tag label={appData.name} color={C.muted} />}
            {mode === "b2b" && result.icp && <Tag label="B2B" color={C.accentB2B} />}
          </div>
          <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, lineHeight: 1.25, color: C.text, margin: 0 }}>{result.verdict}</p>
        </div>
      </div>

      {/* Professional niche warning */}
      {result.professionalNicheWarning && (
        <div style={{ padding: "14px 18px", marginBottom: 16, background: `${C.orange}11`, border: `1px solid ${C.orange}55`, borderRadius: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, lineHeight: 1.3, color: C.orange, flexShrink: 0 }}>⚠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.orange, marginBottom: 4 }}>Professional Niche Detected</div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: C.text, margin: 0 }}>{result.professionalNicheWarning}</p>
          </div>
        </div>
      )}

      {/* Sub-score bars */}
      {(typeof result.demandScore === "number" || typeof result.competitionScore === "number" || typeof result.timingScore === "number") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Demand", value: result.demandScore, hint: "pain intensity × volume" },
            { label: "Competition", value: result.competitionScore, hint: "higher = more whitespace" },
            { label: "Timing", value: result.timingScore, hint: "trend direction" },
          ].map(({ label, value, hint }) => {
            const v = typeof value === "number" ? value : 0;
            const color = v >= 70 ? C.green : v >= 40 ? C.orange : C.red;
            return (
              <div key={label} style={{ padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted }}>{label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700, color }}>{typeof value === "number" ? value : "—"}</span>
                </div>
                <div style={{ width: "100%", height: 4, background: C.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ width: `${v}%`, height: "100%", background: color, transition: "width 1s ease" }} />
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.textDim, letterSpacing: "0.05em" }}>{hint}</div>
              </div>
            );
          })}
        </div>
      )}

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
// Sample B2C analysis — shown in empty state so first-time users see what a report looks like
const SAMPLE_B2C_RESULT = {
  opportunityScore: 78,
  demandScore: 84,
  competitionScore: 72,
  timingScore: 76,
  signalConfidence: "HIGH",
  professionalNicheWarning: null,
  verdict: "Type 2 diabetics are starving for meal planners that think in blood sugar, not calories — and the big apps are all still counting points.",
  demandStrength: "HIGH",
  competitionLevel: "MODERATE",
  topPainThemes: [
    { theme: "Generic calorie tracking ignores glucose response", frequency: "HIGH", exactPhrases: ["i don't care about calories, i care about my a1c", "why can't an app just tell me what to eat"] },
    { theme: "Meal plans assume you cook from scratch every night", frequency: "HIGH", exactPhrases: ["i'm tired after work", "need something i can grab"] },
    { theme: "No integration with CGM data", frequency: "MED", exactPhrases: ["libre data just sits there", "wish it talked to my dexcom"] },
  ],
  missingFeatures: [
    "Glucose-response-based meal scoring (not just carbs)",
    "CGM integration that actually closes the loop",
    "Grocery-list export with diabetic-friendly swaps",
  ],
  positioningAngle: "The meal planner that reads your CGM and tells you what to eat tomorrow.",
  targetAudience: "Newly-diagnosed type 2 diabetics (40-65) who already wear a CGM and are overwhelmed by generic diet apps.",
  redditInsight: "The loudest complaint isn't about food restriction — it's about apps treating them like weight-loss patients instead of metabolic patients.",
  demandQuotes: [
    { quote: "Every app I try is just MyFitnessPal with a diabetes badge slapped on it. I need something that actually uses my Libre data.", type: "lamenting", upvotes: 147 },
    { quote: "Looking for a meal planner that says 'eat this tomorrow' based on how I reacted today. Does this exist?", type: "seeking", upvotes: 89 },
    { quote: "MySugr is good for logging but it doesn't TELL me anything. I want a coach, not a notebook.", type: "lamenting", upvotes: 62 },
  ],
  competitorMatrix: [
    { name: "MySugr", rating: 4.6, topComplaint: "Logging only, no meal guidance", missingFeature: "Prescriptive meal plans", pricePoint: "Free + $2.99/mo", weaknessScore: 62 },
    { name: "Fooducate", rating: 4.4, topComplaint: "Generic health focus, not diabetes-specific", missingFeature: "CGM integration", pricePoint: "Free + $4.99/mo", weaknessScore: 71 },
    { name: "Glucose Buddy", rating: 4.5, topComplaint: "Dated UI, slow updates", missingFeature: "AI meal suggestions", pricePoint: "Free", weaknessScore: 68 },
  ],
  sharedWeakness: "None of them use CGM response data to close the loop on meal planning.",
  buildRecommendation: "CGM-reactive meal planner: reads yesterday's glucose curves, suggests tomorrow's meals, learns which foods spike you.",
  warnings: [
    "Medical-adjacent positioning may trigger FDA scrutiny if claims get aggressive.",
    "CGM API access varies by device — Dexcom/Libre integration is the critical partnership.",
  ],
};

function B2CPanel({ prefill, onPrefillConsumed, onSave }) {
  const [showSample, setShowSample] = useState(false);
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {["sleep tracking", "ADHD focus", "freelance invoicing", "meal planning", "habit tracking"].map(ex => (
          <button key={ex} onClick={() => setQuery(ex)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, padding: "4px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "border-color .2s,color .2s" }}
            onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textDim; }}>
            {ex}
          </button>
        ))}
        {phase === "idle" && !result && (
          <button onClick={() => setShowSample(v => !v)} style={{ marginLeft: "auto", background: "none", border: `1px dashed ${C.accent}66`, color: C.accent, fontSize: 11, padding: "4px 12px", borderRadius: 3, cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {showSample ? "✕ Hide sample" : "👁 See a sample report"}
          </button>
        )}
      </div>

      {/* Sample empty-state preview */}
      {phase === "idle" && !result && showSample && (
        <div style={{ marginTop: 32, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: `${C.accent}0d`, border: `1px solid ${C.accent}44`, borderRadius: "8px 8px 0 0", borderBottom: "none" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accent, marginBottom: 2 }}>Sample · read-only preview</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.text }}>meal planning for type 2 diabetics</div>
            </div>
            <button onClick={() => { setQuery("meal planning for type 2 diabetics"); setShowSample(false); setTimeout(() => runRef.current?.(), 60); }} style={{ background: C.accent, color: C.bg, border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Run your own →
            </button>
          </div>
          <div style={{ border: `1px solid ${C.accent}44`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "0 16px 16px", pointerEvents: "none", opacity: 0.92 }}>
            <Results result={SAMPLE_B2C_RESULT} appData={null} query="meal planning for type 2 diabetics" competitors={[]} mode="b2c" onSave={undefined} />
          </div>
        </div>
      )}

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

      {/* Competitive Landscape Map */}
      <CompetitiveLandscapePanel onSave={onSave} />
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

      {/* Competitive Landscape Map */}
      <CompetitiveLandscapePanel onSave={onSave} />
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

Return exactly 10 opportunities ordered by opportunityScore descending. Be specific — "AI-generated content authenticity verification for journalists" beats "content verification".`;

  return streamClaude(prompt, onChunk, 8000);
}

async function synthesizeDiscovery(domain, onChunk) {
  onChunk(`Scanning ${domain.label}…`);

  // Tight prompt — must complete inside Edge function streaming window (~25s on Hobby).
  // Schema kept multi-line and explicit so the model doesn't drop the wrapper array.
  const prompt = `You are a sharp product strategist. Identify 8 compelling unmet needs in the "${domain.label}" space.

DOMAIN CONTEXT: ${domain.context}

Rules:
- Account for ALL existing solutions (apps, SaaS, AI tools, browser extensions). If Notion/Airtable/ChatGPT/etc covers it, score low.
- Favor gaps that emerged or intensified in 2024-2025.
- Be conservative: 70+ = real gap with weak solutions. 45-69 = real demand, beatable competition. <45 = saturated.

Return JSON only, no markdown fences. The top-level object MUST have a single key "opportunities" whose value is an array of exactly 8 objects in this exact shape:

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
      "knownTools": "<2-3 existing tools or 'None identified'>",
      "verdict": "<one honest punchy sentence>",
      "signalQuote": "<paraphrased frustrated user quote>",
      "buildAngle": "<one specific sentence on what to build>"
    }
  ]
}

Order by opportunityScore descending. Return exactly 8.`;

  return streamClaude(prompt, onChunk, 4500);
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
          <button type="button" onClick={(e) => { e.preventDefault(); try { onSave && onSave(opp, "Discovery"); setSavedLocal(true); } catch (err) { console.error("[OpportunityRow Save] failed:", err); } }}
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
function DiscoveryPanel({ onDiveDeep, onSave }) {
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
      {/* Domain deep-dive grid */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Deep-dive a specific domain</div>
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


// ── Competitive Landscape export utilities ─────────────────────────────────
function exportLandscapeMarkdown(space, competitors, result) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const lines = [
    `# Competitive Landscape: ${space}`,
    `*Generated ${date} · niche-gap.vercel.app*`,
    `**Competitors analyzed:** ${competitors.join(", ")}`,
    `**Market maturity:** ${result.marketMaturity || "N/A"}`,
    `\n---\n`,
    `## Overview\n\n${result.landscapeSummary}`,
    result.recommendedPositioning ? `\n**Positioning:** "${result.recommendedPositioning}"` : "",
    `\n---\n`,
    `## Competitor Breakdown\n`,
  ];

  result.competitors?.forEach(c => {
    lines.push(`### ${c.name}`);
    lines.push(`★${c.rating?.toFixed(1)} · ${c.reviewCount?.toLocaleString()} reviews · ${c.price} · Sentiment: ${c.userSentiment} · Vulnerability: ${c.vulnerabilityScore}/100`);
    lines.push(`\n**Built for:** ${c.targetUser || "N/A"}`);
    lines.push(`\n**Strength:** ${c.strengthSummary || "N/A"}`);
    if (c.topComplaints?.length) lines.push(`\n**Top complaints:**\n${c.topComplaints.map(x => `- ${x}`).join("\n")}`);
    if (c.missingFeatures?.length) lines.push(`\n**Missing features:**\n${c.missingFeatures.map(x => `- ${x}`).join("\n")}`);
    lines.push("\n");
  });

  lines.push(`---\n`);
  lines.push(`## Shared Weaknesses\n`);
  result.sharedWeaknesses?.forEach(w => lines.push(`- ${w}`));
  lines.push(`\n## Whitespace Opportunity\n\n> "${result.whitespaceOpportunity}"`);
  if (result.priceGap && result.priceGap !== "None identified") lines.push(`\n## Price Gap\n\n${result.priceGap}`);
  if (result.winningAngle) lines.push(`\n## Winning Angle\n\n${result.winningAngle}`);
  lines.push(`\n---\n*Sources: App Store RSS · Reddit API · Claude Synthesis*`);

  const blob = new Blob([lines.filter(Boolean).join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `landscape-${space.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportLandscapeHTML(space, competitors, result) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const vulnColor = s => s >= 70 ? "#47ffb2" : s >= 45 ? "#ffab47" : "#ff4d4d";
  const sentColor = s => s === "POSITIVE" ? "#47ffb2" : s === "NEGATIVE" ? "#ff4d4d" : "#ffab47";

  const competitorCards = (result.competitors || []).map(c => `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-name">${c.name}</div>
          <div class="card-meta">★${c.rating?.toFixed(1)} · ${c.reviewCount?.toLocaleString()} reviews · ${c.price}</div>
        </div>
        <div class="vuln-score" style="color:${vulnColor(c.vulnerabilityScore)}">${c.vulnerabilityScore}<span class="vuln-label">vuln</span></div>
      </div>
      <div class="sent-row">
        <span class="sent-tag" style="color:${sentColor(c.userSentiment)};border-color:${sentColor(c.userSentiment)}44">${c.userSentiment}</span>
        ${c.targetUser ? `<span class="for-user">for ${c.targetUser}</span>` : ""}
      </div>
      ${c.strengthSummary ? `<div class="section-label green">Strength</div><p class="body-text">${c.strengthSummary}</p>` : ""}
      ${c.topComplaints?.length ? `<div class="section-label red">Top Complaints</div>${c.topComplaints.map(x => `<div class="list-item"><span class="red">⚠</span>${x}</div>`).join("")}` : ""}
      ${c.missingFeatures?.length ? `<div class="section-label orange">Missing</div>${c.missingFeatures.map(x => `<div class="list-item"><span class="orange">→</span>${x}</div>`).join("")}` : ""}
    </div>`).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Landscape: ${space}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0b;color:#e2e2e8;font-family:'DM Sans',sans-serif;max-width:960px;margin:0 auto;padding:48px 32px 80px}
h1{font-family:'Instrument Serif',serif;font-size:38px;font-weight:400;line-height:1.1;margin-bottom:8px}
h1 em{color:#47ffb2;font-style:italic}
h2{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8888a0;margin-bottom:14px}
.meta{font-family:'DM Mono',monospace;font-size:11px;color:#4a4a5a;margin-bottom:28px}
.tag{display:inline-block;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0b;padding:2px 8px;border-radius:2px;font-weight:700;margin-right:6px}
.summary-box{background:#111114;border:1px solid #47ffb244;border-radius:8px;padding:22px 24px;margin-bottom:20px}
.summary-text{font-size:14px;color:#8888a0;line-height:1.7;margin-bottom:14px}
.positioning{padding:10px 14px;background:rgba(71,255,178,0.07);border:1px solid rgba(71,255,178,0.2);border-radius:5px}
.pos-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#47ffb2;display:block;margin-bottom:4px}
.pos-text{font-family:'Instrument Serif',serif;font-size:15px;font-style:italic;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:20px}
.card{background:#111114;border:1px solid #1e1e24;border-radius:8px;padding:18px 20px}
.card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.card-name{font-size:15px;font-weight:700;margin-bottom:3px}
.card-meta{font-family:'DM Mono',monospace;font-size:10px;color:#8888a0}
.vuln-score{font-family:'DM Mono',monospace;font-size:22px;font-weight:700;line-height:1;text-align:right}
.vuln-label{display:block;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;color:#4a4a5a}
.sent-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.sent-tag{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;padding:2px 7px;border-radius:2px;border:1px solid}
.for-user{font-family:'DM Mono',monospace;font-size:9px;color:#4a4a5a}
.section-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;margin:10px 0 6px}
.section-label.green{color:#47ffb2}.section-label.red{color:#ff4d4d}.section-label.orange{color:#ffab47}
.body-text{font-size:12px;color:#8888a0;line-height:1.5}
.list-item{display:flex;gap:6px;margin-bottom:4px;font-size:12px;color:#8888a0;line-height:1.4;align-items:flex-start}
.red{color:#ff4d4d}.orange{color:#ffab47}.green{color:#47ffb2}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
section{background:#111114;border:1px solid #1e1e24;border-radius:8px;padding:20px 22px}
.whitespace-box{padding:14px 18px;background:rgba(71,255,178,0.07);border:1px solid rgba(71,255,178,0.22);border-radius:6px}
.whitespace-text{font-family:'Instrument Serif',serif;font-size:15px;font-style:italic;line-height:1.6}
.footer{font-family:'DM Mono',monospace;font-size:10px;color:#4a4a5a;display:flex;justify-content:space-between;margin-top:32px;padding-top:20px;border-top:1px solid #1e1e24}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
@media print{
  @page{size:A4;margin:14mm}
  html,body{background:#ffffff!important;color:#1a1a1f!important}
  body{padding:0!important;max-width:none!important}
  button{display:none!important}
  h1{color:#0a0a0b!important}
  h2{color:#555566!important}
  section{background:#ffffff!important;border:1px solid #d8d8de!important;break-inside:avoid;page-break-inside:avoid;margin-bottom:12px!important}
  .meta,.footer{color:#666677!important}
  .footer{border-top:1px solid #d8d8de!important}
  .summary-box{background:#fafffd!important;border-color:#9ae5c4!important}
  .summary-text{color:#333344!important}
  .card{background:#ffffff!important;border:1px solid #d8d8de!important;break-inside:avoid;page-break-inside:avoid}
  .card-name{color:#0a0a0b!important}
  .card-meta,.body-text,.list-item{color:#444455!important}
  .for-user{color:#777788!important}
  .whitespace-box{background:#f3fff9!important;border-color:#9ae5c4!important}
  .whitespace-text,.pos-text{color:#0a0a0b!important}
  .positioning{background:#f3fff9!important;border-color:#9ae5c4!important}
  .tag{color:#0a0a0b!important}
}
</style></head><body>

<div style="margin-bottom:32px">
  <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#47ffb2;margin-bottom:12px">Niche Gap Analyzer · Competitive Landscape</div>
  <h1>Landscape:<br/><em>${space}</em></h1>
  <p class="meta">${date} · Competitors: ${competitors.join(", ")}</p>
  <button onclick="window.print()" style="background:#47ffb2;color:#0a0a0b;border:none;cursor:pointer;padding:10px 20px;font-family:'DM Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px">Save as PDF</button>
</div>

<div class="summary-box">
  ${result.marketMaturity ? `<span class="tag" style="background:${result.marketMaturity === "EMERGING" ? "#47ffb2" : result.marketMaturity === "GROWING" ? "#e8ff47" : result.marketMaturity === "MATURE" ? "#ffab47" : "#ff4d4d"}">${result.marketMaturity}</span>` : ""}
  <span class="tag" style="background:#47ffb2">${(result.competitors || []).length} Competitors Mapped</span>
  <p class="summary-text" style="margin-top:12px">${result.landscapeSummary}</p>
  ${result.recommendedPositioning ? `<div class="positioning"><span class="pos-label">Recommended Positioning</span><p class="pos-text">"${result.recommendedPositioning}"</p></div>` : ""}
</div>

<h2>Competitor Breakdown</h2>
<div class="grid">${competitorCards}</div>

<div class="two-col">
  <section>
    <h2>Shared Weaknesses</h2>
    ${(result.sharedWeaknesses || []).map(w => `<div class="list-item"><span class="red">⚠</span>${w}</div>`).join("")}
  </section>
  <section style="border-color:#47ffb244">
    <h2 style="color:#47ffb2">Whitespace Opportunity</h2>
    <div class="whitespace-box"><p class="whitespace-text">"${result.whitespaceOpportunity}"</p></div>
    ${result.priceGap && result.priceGap !== "None identified" ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid #47ffb222"><div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#47ffb2;margin-bottom:5px">Price Gap</div><p style="font-size:12px;color:#8888a0;line-height:1.5">${result.priceGap}</p></div>` : ""}
  </section>
</div>

${result.winningAngle ? `<section><h2>Winning Angle</h2><p style="font-size:14px;line-height:1.7;color:#e2e2e8">${result.winningAngle}</p></section>` : ""}

<div class="footer">
  <span>SOURCES: App Store RSS · Reddit API · Claude Synthesis</span>
  <span>© ${new Date().getFullYear()} jasonpfields.com · niche-gap.vercel.app</span>
</div>
</body></html>`;

  printHTMLViaIframe(html, `Competitive Landscape — ${space}`);
}

// ── Competitive Landscape Panel ────────────────────────────────────────────
function CompetitiveLandscapePanel({ onSave }) {
  const [space, setSpace] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const accentLand = "#47ffb2"; // green for landscape

  const addCompetitor = () => {
    const v = competitorInput.trim();
    if (!v || competitors.length >= 5 || competitors.includes(v)) return;
    setCompetitors(c => [...c, v]);
    setCompetitorInput("");
  };

  const removeCompetitor = (name) => setCompetitors(c => c.filter(x => x !== name));

  const run = async () => {
    if (!space.trim() || competitors.length < 2) return;
    setResult(null); setStreamText(""); setErrorDetail("");
    try {
      setPhase("fetching");
      const competitorData = await Promise.all(competitors.map(c => fetchCompetitorData(c)));
      setPhase("synthesizing");
      const analysis = await synthesizeCompetitiveLandscape(space, competitors, competitorData, p => setStreamText(p));
      if (analysis) { setResult(analysis); setPhase("done"); }
      else { setErrorDetail("Analysis returned empty."); setPhase("error"); }
    } catch (e) { setErrorDetail(e?.message || String(e)); setPhase("error"); }
  };

  const clear = () => { setSpace(""); setCompetitors([]); setPhase("idle"); setResult(null); setStreamText(""); setErrorDetail(""); };
  const busy = phase === "fetching" || phase === "synthesizing";

  const vulnColor = s => s >= 70 ? C.green : s >= 45 ? C.orange : C.red;
  const sentColor = s => s === "POSITIVE" ? C.green : s === "NEGATIVE" ? C.red : C.orange;
  const maturityColor = m => m === "EMERGING" ? C.green : m === "GROWING" ? C.accent : m === "MATURE" ? C.orange : C.red;

  return (
    <div style={{ marginTop: 48, paddingTop: 40, borderTop: `1px solid ${C.border}` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accentLand }}>
          Competitive Landscape Map
        </h2>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>— full side-by-side analysis of up to 5 competitors</span>
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {/* Space input */}
        <div style={{ display: "flex", border: `1px solid ${busy ? accentLand : C.borderLit}`, borderRadius: 6, overflow: "hidden", transition: "border-color .3s" }}>
          <span style={{ padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
            Space
          </span>
          <input value={space} onChange={e => setSpace(e.target.value)} onKeyDown={e => e.key === "Enter" && addCompetitor()}
            placeholder="e.g. meditation apps, project management, invoicing tools…"
            style={{ flex: 1, background: C.surface, border: "none", outline: "none", color: C.text, fontSize: 14, padding: "12px 16px", fontFamily: "'DM Sans', sans-serif" }}/>
        </div>

        {/* Competitor chip input */}
        <div style={{ display: "flex", gap: 8 }}>
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
            style={{ background: competitorInput.trim() && competitors.length < 5 ? C.borderLit : C.border, color: C.text, border: "none", cursor: "pointer", padding: "10px 16px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Add</button>
        </div>

        {/* Chips */}
        {competitors.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {competitors.map(name => (
              <div key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${accentLand}44`, borderRadius: 4, padding: "4px 10px" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: accentLand }}>{name}</span>
                <button onClick={() => removeCompetitor(name)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ))}
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>{5 - competitors.length} slots remaining · minimum 2</span>
          </div>
        )}

        {/* Run button */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={run} disabled={!space.trim() || competitors.length < 2 || busy}
            style={{ background: space.trim() && competitors.length >= 2 && !busy ? accentLand : C.muted, color: C.bg, border: "none", cursor: space.trim() && competitors.length >= 2 && !busy ? "pointer" : "default", padding: "12px 28px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", transition: "background .2s" }}>
            {busy ? <Pulse color={C.bg} /> : "Map the Landscape"}
          </button>
          {(phase === "done" || phase === "error") && (
            <button onClick={clear} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", padding: "12px 20px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "color .2s, border-color .2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      {busy && (
        <div style={{ padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Pulse color={accentLand} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textDim }}>
            {phase === "fetching" ? `Fetching data for ${competitors.length} competitors…` : "Building landscape map…"}
          </span>
        </div>
      )}
      {phase === "synthesizing" && streamText && (
        <div style={{ padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 100, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 60%,transparent)", marginBottom: 12 }}>{streamText.slice(-400)}</div>
      )}
      {phase === "error" && (
        <div style={{ padding: 20, border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6, color: C.red, fontFamily: "'DM Mono', monospace", fontSize: 12, marginBottom: 12 }}>
          Analysis failed. {errorDetail && <span style={{ color: C.textDim }}>{errorDetail}</span>}
        </div>
      )}

      {/* Results */}
      {phase === "done" && result && (
        <div style={{ animation: "fadeUp .5s ease both" }}>

          {/* Summary + meta */}
          <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${accentLand}44`, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              {result.marketMaturity && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.bg, background: maturityColor(result.marketMaturity), padding: "2px 8px", borderRadius: 2, fontWeight: 700 }}>
                  {result.marketMaturity}
                </span>
              )}
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.bg, background: accentLand, padding: "2px 8px", borderRadius: 2, fontWeight: 700 }}>
                {result.competitors?.length} Competitors Mapped
              </span>
            </div>
            <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.7, marginBottom: result.recommendedPositioning ? 16 : 0 }}>{result.landscapeSummary}</p>
            {result.recommendedPositioning && (
              <div style={{ padding: "10px 14px", background: `${accentLand}0d`, border: `1px solid ${accentLand}22`, borderRadius: 5, marginTop: 12 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: accentLand, display: "block", marginBottom: 4 }}>Recommended Positioning</span>
                <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 15, lineHeight: 1.5, fontStyle: "italic" }}>"{result.recommendedPositioning}"</p>
              </div>
            )}
          </div>

          {/* Competitor cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12, marginBottom: 16 }}>
            {result.competitors?.map((c, i) => (
              <div key={i} style={{ padding: "18px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                {/* Card header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>{c.price} · ★{c.rating?.toFixed(1)} · {c.reviewCount?.toLocaleString()} reviews</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: vulnColor(c.vulnerabilityScore), lineHeight: 1 }}>{c.vulnerabilityScore}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>vuln</div>
                  </div>
                </div>

                {/* Sentiment tag */}
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: sentColor(c.userSentiment), border: `1px solid ${sentColor(c.userSentiment)}44`, padding: "2px 7px", borderRadius: 2 }}>{c.userSentiment}</span>
                  {c.targetUser && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.muted, marginLeft: 8 }}>for {c.targetUser}</span>}
                </div>

                {/* Strength */}
                {c.strengthSummary && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green, marginBottom: 4 }}>Strength</div>
                    <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{c.strengthSummary}</p>
                  </div>
                )}

                {/* Complaints */}
                {c.topComplaints?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.red, marginBottom: 6 }}>Top Complaints</div>
                    {c.topComplaints.map((complaint, j) => (
                      <div key={j} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "flex-start" }}>
                        <span style={{ color: C.red, fontSize: 10, flexShrink: 0, marginTop: 2 }}>⚠</span>
                        <span style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{complaint}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing features */}
                {c.missingFeatures?.length > 0 && (
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.orange, marginBottom: 6 }}>Missing</div>
                    {c.missingFeatures.map((f, j) => (
                      <div key={j} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "flex-start" }}>
                        <span style={{ color: C.orange, fontSize: 11, flexShrink: 0 }}>→</span>
                        <span style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Shared weaknesses + whitespace */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: "18px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.red, marginBottom: 14 }}>Shared Weaknesses</h3>
              {result.sharedWeaknesses?.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                  <span style={{ color: C.red, fontSize: 12, flexShrink: 0 }}>⚠</span>
                  <span style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>{w}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "18px 20px", background: `${accentLand}0a`, border: `1px solid ${accentLand}44`, borderRadius: 8 }}>
              <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: accentLand, marginBottom: 12 }}>Whitespace Opportunity</h3>
              <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 15, lineHeight: 1.6, fontStyle: "italic", color: C.text }}>"{result.whitespaceOpportunity}"</p>
              {result.priceGap && result.priceGap !== "None identified" && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${accentLand}22` }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: accentLand, marginBottom: 5 }}>Price Gap</div>
                  <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{result.priceGap}</p>
                </div>
              )}
            </div>
          </div>

          {/* Winning angle */}
          {result.winningAngle && (
            <div style={{ padding: "18px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDim, marginBottom: 10 }}>Winning Angle</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: C.text }}>{result.winningAngle}</p>
            </div>
          )}

          {/* Export buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => exportLandscapeMarkdown(space, competitors, result)}
              style={{ background: "none", border: `1px solid ${C.borderLit}`, color: C.textDim, cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7, transition: "border-color .2s,color .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accentLand; e.currentTarget.style.color = accentLand; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLit; e.currentTarget.style.color = C.textDim; }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Markdown
            </button>
            <button onClick={() => exportLandscapeHTML(space, competitors, result)}
              style={{ background: accentLand, border: `1px solid ${accentLand}`, color: C.bg, cursor: "pointer", padding: "8px 16px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Export Report
            </button>
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

// ── Saved stats panel — replaces ZeitgeistHero on Saved tab ──────────────
function SavedStatsPanel({ saved, onExport, onDiveDeep, onClearAll }) {
  const accentSaved = "#ffd166";
  if (saved.length === 0) {
    return (
      <div style={{ marginBottom: 32, padding: "20px 28px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 24 }}>🔖</span>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>Your Shortlist</div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, lineHeight: 1.6 }}>Bookmark opportunities from Discovery, B2C, or B2B to build your research shortlist.</p>
        </div>
      </div>
    );
  }

  const avgScore = Math.round(saved.reduce((a, b) => a + (b.opp.opportunityScore || 0), 0) / saved.length);
  const topItem = saved.reduce((a, b) => (b.opp.opportunityScore || 0) > (a.opp.opportunityScore || 0) ? b : a);
  const whitespaceCount = saved.filter(x => x.opp.type === "whitespace").length;
  const highDemand = saved.filter(x => x.opp.demandStrength === "HIGH").length;

  return (
    <div style={{ marginBottom: 32, padding: "20px 28px", background: C.surface, border: `1px solid ${accentSaved}33`, borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
      {/* Left: stats */}
      <div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: accentSaved, marginBottom: 14 }}>
          Shortlist Overview
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Saved", value: saved.length, color: accentSaved },
            { label: "Avg Score", value: avgScore, color: avgScore >= 70 ? C.green : avgScore >= 45 ? C.orange : C.red },
            { label: "Whitespace", value: whitespaceCount, color: C.green },
            { label: "High Demand", value: highDemand, color: C.green },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 2 }}>
          Top pick: <span style={{ color: accentSaved }}>{topItem.opp.niche}</span> · {topItem.opp.opportunityScore}
        </div>
        <button onClick={() => onDiveDeep(topItem.opp.niche)}
          style={{ background: accentSaved, color: C.bg, border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 5, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "left", transition: "opacity .2s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          → Deep Dive Top Pick in B2C
        </button>
        <button onClick={onExport}
          style={{ background: "none", border: `1px solid ${C.borderLit}`, color: C.textDim, cursor: "pointer", padding: "9px 16px", borderRadius: 5, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "left", display: "flex", alignItems: "center", gap: 7, transition: "border-color .2s, color .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accentSaved; e.currentTarget.style.color = accentSaved; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLit; e.currentTarget.style.color = C.textDim; }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Export All as Markdown
        </button>
        <button onClick={onClearAll}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", padding: "9px 16px", borderRadius: 5, fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "left", transition: "border-color .2s, color .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
          ✕ Clear All
        </button>
      </div>
    </div>
  );
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

// ── Zeitgeist Hero — single home for cross-domain scan + per-domain drill-in ──
function ZeitgeistHero({ onDiveDeep, onSave }) {
  // phase: "idle" | "synth-zeitgeist" | "synth-domain" | "done" | "error"
  const [phase, setPhase] = useState("idle");
  const [zeitgeistResult, setZeitgeistResult] = useState(null);
  const [drillResult, setDrillResult] = useState(null);
  const [drillDomain, setDrillDomain] = useState(null); // DOMAINS entry currently being drilled
  const [streamText, setStreamText] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const accentDisc = "#ff6bff";

  const runZeitgeist = async () => {
    if (phase === "synth-zeitgeist" || phase === "synth-domain") return;
    setZeitgeistResult(null); setDrillResult(null); setDrillDomain(null);
    setStreamText(""); setPage(0); setErrorDetail("");
    setPhase("synth-zeitgeist");
    try {
      const analysis = await synthesizeZeitgeist(p => setStreamText(p));
      if (analysis) { setZeitgeistResult(analysis); setPhase("done"); }
      else { setErrorDetail("Claude returned null."); setPhase("error"); }
    } catch (e) { console.error(e); setErrorDetail(e?.message || String(e)); setPhase("error"); }
  };

  const drillIntoDomain = async (domainLabel) => {
    const domain = DOMAINS.find(d => d.label === domainLabel);
    if (!domain || phase === "synth-domain" || phase === "synth-zeitgeist") return;
    setDrillDomain(domain); setDrillResult(null); setStreamText(""); setPage(0); setErrorDetail("");
    setPhase("synth-domain");
    try {
      const analysis = await synthesizeDiscovery(domain, p => setStreamText(p));
      if (analysis) { setDrillResult(analysis); setPhase("done"); }
      else { setErrorDetail("Claude returned null."); setPhase("error"); }
    } catch (e) { console.error(e); setErrorDetail(e?.message || String(e)); setPhase("error"); }
  };

  const backToZeitgeist = () => {
    setDrillResult(null); setDrillDomain(null); setPage(0); setPhase("done");
  };

  const busy = phase === "synth-zeitgeist" || phase === "synth-domain";
  const scoreColor = s => s >= 70 ? C.green : s >= 45 ? C.orange : C.red;
  const demandColor = d => d === "HIGH" ? C.green : d === "MEDIUM" ? C.orange : C.red;
  const compColor = c => c === "ABSENT" || c === "THIN" ? C.green : c === "MODERATE" ? C.orange : C.red;

  // Decide what to display: drill results take priority, otherwise zeitgeist
  const showingDrill = !!(drillDomain && drillResult);
  const allOpps = showingDrill ? (drillResult?.opportunities || []) : (zeitgeistResult?.opportunities || []);
  const totalPages = Math.ceil(allOpps.length / PAGE_SIZE);
  const pageOpps = allOpps.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const domainCounts = (zeitgeistResult?.opportunities || []).reduce((acc, o) => { acc[o.domain] = (acc[o.domain] || 0) + 1; return acc; }, {});

  return (
    <div style={{ marginBottom: 32 }}>
      {/* The main CTA button */}
      <button onClick={() => !busy && runZeitgeist()} disabled={busy}
        style={{
          width: "100%", padding: "20px 28px",
          background: busy ? `${accentDisc}12` : `${accentDisc}08`,
          border: `1px solid ${busy ? accentDisc : accentDisc + "44"}`,
          borderRadius: 10, cursor: busy ? "default" : "pointer",
          transition: "border-color .2s, background .2s", marginBottom: 0,
        }}
        onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = accentDisc; e.currentTarget.style.background = `${accentDisc}14`; }}}
        onMouseLeave={e => { if (!busy) { e.currentTarget.style.borderColor = accentDisc + "44"; e.currentTarget.style.background = `${accentDisc}08`; }}}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: accentDisc, marginBottom: 3 }}>
                {phase === "synth-zeitgeist" ? "Scanning the Zeitgeist…" : phase === "synth-domain" ? `Drilling into ${drillDomain?.label}…` : "Scan the Zeitgeist"}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim }}>
                Cross-domain market scan · click any category below to drill deeper
              </div>
            </div>
          </div>
          {busy ? <Pulse color={accentDisc} /> : (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: accentDisc }}>→</div>
          )}
        </div>
      </button>

      {/* Streaming preview */}
      {busy && streamText && (
        <div style={{ marginTop: 8, padding: "12px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 80, overflow: "hidden", maskImage: "linear-gradient(to bottom,black 50%,transparent)" }}>{streamText.slice(-300)}</div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div style={{ marginTop: 12, padding: "14px 18px", border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.red, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Scan failed</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, marginBottom: 8 }}>{errorDetail || "Unknown error"}</div>
          <button onClick={drillDomain ? () => drillIntoDomain(drillDomain.label) : runZeitgeist} style={{ background: "none", border: `1px solid ${C.red}66`, color: C.red, cursor: "pointer", padding: "4px 12px", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ↻ Retry
          </button>
        </div>
      )}

      {/* Results */}
      {phase === "done" && allOpps.length > 0 && (
        <div style={{ marginTop: 12, animation: "fadeUp .4s ease both" }}>
          {/* Drill-in header */}
          {showingDrill && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 14px", background: `${accentDisc}10`, border: `1px solid ${accentDisc}33`, borderRadius: 6 }}>
              <button onClick={backToZeitgeist} style={{ background: "none", border: `1px solid ${accentDisc}55`, color: accentDisc, cursor: "pointer", padding: "3px 10px", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                ← Back to Zeitgeist
              </button>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {drillDomain?.emoji} Deep dive · {drillDomain?.label} · {allOpps.length} opportunities
              </span>
              <button onClick={() => drillIntoDomain(drillDomain.label)} style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", padding: "3px 9px", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                ↻ Rescan
              </button>
            </div>
          )}

          {/* Domain drill-in chips (only on zeitgeist view) */}
          {!showingDrill && Object.keys(domainCounts).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginRight: 4 }}>Drill into:</span>
              {Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).map(([domainLabel, count]) => {
                const d = DOMAINS.find(x => x.label === domainLabel);
                return (
                  <button key={domainLabel} onClick={() => drillIntoDomain(domainLabel)} title={`Run a deep scan of ${domainLabel}`}
                    style={{ background: C.surface, color: C.textDim, border: `1px solid ${C.border}`, cursor: "pointer", padding: "3px 9px", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "border-color .2s,color .2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = accentDisc; e.currentTarget.style.color = accentDisc; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}>
                    {d?.emoji} {domainLabel.split(" ")[0]} {count} →
                  </button>
                );
              })}
              <button onClick={runZeitgeist} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", padding: "3px 9px", borderRadius: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: "auto" }}>
                ↻ Rescan
              </button>
            </div>
          )}

          {/* Compact table */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 70px 80px 90px 150px", gap: 0, padding: "8px 18px", borderBottom: `1px solid ${C.border}` }}>
              {["Score", "Niche", "Type", "Demand", "Competition", ""].map((h, i) => (
                <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>{h}</div>
              ))}
            </div>
            {pageOpps.map((opp, i) => (
              <OpportunityRow key={`hero-${showingDrill ? "drill" : "z"}-${page}-${i}`} opp={opp} index={i} total={pageOpps.length}
                onDiveDeep={onDiveDeep} onSave={onSave} accentDisc={accentDisc}
                scoreColor={scoreColor} demandColor={demandColor} compColor={compColor} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: page === 0 ? C.muted : C.text, cursor: page === 0 ? "default" : "pointer", padding: "5px 12px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700 }}>←</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  style={{ background: page === i ? accentDisc : C.surface, border: `1px solid ${page === i ? accentDisc : C.border}`, color: page === i ? C.bg : C.textDim, cursor: "pointer", padding: "5px 10px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: page === totalPages - 1 ? C.muted : C.text, cursor: page === totalPages - 1 ? "default" : "pointer", padding: "5px 12px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700 }}>→</button>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, marginLeft: 4 }}>{allOpps.length} results</span>
            </div>
          )}
        </div>
      )}
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
    try {
      if (!opp || typeof opp !== "object") {
        console.warn("[handleSave] ignored — bad opp shape:", opp);
        return;
      }
      const niche = opp.niche || "Untitled opportunity";
      const safeOpp = { ...opp, niche };
      setSaved(s => {
        if (s.find(x => x.opp.niche === safeOpp.niche)) return s; // no dupes
        return [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, opp: safeOpp, source: source || "Unknown", savedAt: Date.now(), note: "" }, ...s];
      });
    } catch (e) {
      console.error("[handleSave] threw:", e);
    }
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
        <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle,${activeTab === "b2b" ? C.accentB2B : activeTab === "saved" ? "#ffd166" : C.accent}18 0%,transparent 70%)`, pointerEvents: "none", zIndex: 0, transition: "background 0.5s" }}/>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 32, animation: "fadeUp .6s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: activeTab === "b2b" ? C.accentB2B : activeTab === "saved" ? "#ffd166" : C.accent, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .3s" }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="7" cy="7" r="5" stroke={C.bg} strokeWidth="2"/>
                  <path d="M11 11l4 4" stroke={C.bg} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M7 4v6M4 7h6" stroke={C.bg} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: activeTab === "b2b" ? C.accentB2B : activeTab === "saved" ? "#ffd166" : C.accent, fontWeight: 500, transition: "color .3s" }}>Niche Gap Analyzer</span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 12 }}>
              Find what people want<br/><em style={{ color: activeTab === "b2b" ? C.accentB2B : activeTab === "saved" ? "#ffd166" : C.accent, transition: "color .3s" }}>that nobody's built yet.</em>
            </h1>
            <p style={{ color: C.textDim, fontSize: 15, maxWidth: 520, lineHeight: 1.6 }}>
              Surface validated market gaps using Reddit pain signals, App Store review analysis, and AI synthesis. Start with the Zeitgeist scan or validate a specific niche.
            </p>
          </div>

          {/* ── Above-tabs module — context-aware ── */}
          {activeTab === "saved" ? (
            <SavedStatsPanel saved={saved} onExport={() => exportSavedMarkdown(saved)} onDiveDeep={(niche) => { handleDiveDeep(niche); setActiveTab("b2c"); }} onClearAll={() => { if (window.confirm("Clear all saved opportunities?")) setSaved([]); }} />
          ) : (
            <ZeitgeistHero onDiveDeep={handleDiveDeep} onSave={handleSave} />
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 32, borderBottom: `1px solid ${C.border}` }}>
            {[
              { key: "b2c",      label: "B2C — Consumer Apps",  accent: C.accent,     sub: "App Store · consumer Reddit" },
              { key: "b2b",      label: "B2B — SaaS & Tools",   accent: C.accentB2B,  sub: "Professional communities · enterprise" },
              { key: "saved",    label: "Saved",                 accent: "#ffd166",    sub: savedCount > 0 ? `${savedCount} item${savedCount !== 1 ? "s" : ""}` : "your shortlist" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "12px 24px 14px",
                borderBottom: activeTab === tab.key ? `2px solid ${tab.accent}` : "2px solid transparent",
                marginBottom: -1, transition: "border-color .2s", position: "relative",
                textAlign: "left",
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
          <div style={{ display: activeTab === "saved" ? "block" : "none" }}>
            <SavedPanel saved={saved} onRemove={handleRemove} onNoteChange={handleNoteChange} />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 60, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>SOURCES: Reddit API · App Store RSS · Claude Synthesis</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>v0.4 · © {new Date().getFullYear()} jasonpfields.com</span>
          </div>

        </div>
      </div>
    </>
  );
}
