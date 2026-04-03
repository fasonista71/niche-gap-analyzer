import { useState, useEffect, useRef } from "react";
import Head from "next/head";

// ── Colour tokens ──────────────────────────────────────────────────────────
const C = {
  bg:        "#0a0a0b",
  surface:   "#111114",
  border:    "#1e1e24",
  borderLit: "#2e2e3a",
  accent:    "#e8ff47",
  accentDim: "#b8cc30",
  muted:     "#4a4a5a",
  text:      "#e2e2e8",
  textDim:   "#8888a0",
  red:       "#ff4d4d",
  green:     "#47ffb2",
  orange:    "#ffab47",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function Tag({ label, color = C.accent }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 10,
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em",
      textTransform: "uppercase", color: C.bg, background: color,
      padding: "2px 8px", borderRadius: 2, fontWeight: 700,
    }}>{label}</span>
  );
}

function ScoreRing({ score, size = 72 }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? C.green : pct >= 45 ? C.orange : C.red;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`,
          fill: color, fontSize: 15, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
        {pct}
      </text>
    </svg>
  );
}

function Pulse() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: C.accent,
          animation: "pulse 1.1s ease-in-out infinite",
          animationDelay: `${d}s`,
        }}/>
      ))}
    </span>
  );
}

// ── Data fetchers — all via server-side proxies ────────────────────────────
async function redditFetch(url) {
  const res = await fetch(`/api/reddit?url=${encodeURIComponent(url)}`);
  return res.json();
}

async function fetchRedditSignals(query) {
  const subs = ["SaaS", "indiehackers", "startups", "nocode", "Entrepreneur", "apps"];
  const url = `https://www.reddit.com/r/${subs.join("+")}/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=25&restrict_sr=false&t=year`;
  try {
    const data = await redditFetch(url);
    return (data?.data?.children || []).map(p => ({
      title: p.data.title,
      selftext: (p.data.selftext || "").slice(0, 400),
      score: p.data.score,
      num_comments: p.data.num_comments,
      subreddit: p.data.subreddit,
    }));
  } catch { return []; }
}

async function fetchRedditDemandSignals(query) {
  const searches = [
    `"is there an app" ${query}`,
    `"why is there no" ${query}`,
  ];
  const results = await Promise.all(searches.map(async (q, i) => {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=15&t=all&type=link`;
      const data = await redditFetch(url);
      return (data?.data?.children || []).map(p => ({
        title: p.data.title,
        selftext: (p.data.selftext || "").slice(0, 300),
        score: p.data.score,
        subreddit: p.data.subreddit,
        demandType: i === 0 ? "seeking" : "lamenting",
      }));
    } catch { return []; }
  }));
  const all = results.flat();
  const seen = new Set();
  return all
    .filter(p => { if (seen.has(p.title)) return false; seen.add(p.title); return true; })
    .sort((a, b) => b.score - a.score);
}

async function fetchAppStoreSignals(query) {
  try {
    const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=1&country=us`);
    const searchData = await searchRes.json();
    const app = searchData?.results?.[0];
    if (!app) return { app: null, reviews: [] };

    const reviewRes = await fetch(`https://itunes.apple.com/rss/customerreviews/page=1/id=${app.trackId}/sortby=mostrecent/json`);
    const reviewData = await reviewRes.json();
    const entries = reviewData?.feed?.entry || [];
    const reviews = entries.slice(1).map(e => ({
      title: e.title?.label || "",
      content: e.content?.label || "",
      rating: parseInt(e["im:rating"]?.label || "3"),
    }));
    return {
      app: {
        name: app.trackName, developer: app.artistName,
        rating: app.averageUserRating, reviews: app.userRatingCount,
        category: app.primaryGenreName, icon: app.artworkUrl60,
      },
      reviews,
    };
  } catch { return { app: null, reviews: [] }; }
}

// ── Claude synthesis — via /api/claude proxy ───────────────────────────────
async function synthesizeWithClaude(query, redditPosts, demandPosts, appStoreData, onChunk) {
  const redditSummary = redditPosts.slice(0, 10).map(p =>
    `[r/${p.subreddit}] "${p.title}" — ${p.selftext?.slice(0, 200) || "no body"}`
  ).join("\n");

  const demandSummary = demandPosts.slice(0, 10).map(p =>
    `[${p.demandType === "seeking" ? "SEEKING" : "LAMENTING"} · r/${p.subreddit} · ↑${p.score}] "${p.title}"${p.selftext ? ` — ${p.selftext.slice(0, 200)}` : ""}`
  ).join("\n");

  const reviewSummary = appStoreData.reviews
    .filter(r => r.rating <= 2).slice(0, 10)
    .map(r => `★${r.rating} "${r.title}": ${r.content?.slice(0, 200)}`).join("\n");

  const appInfo = appStoreData.app
    ? `Top App Store result: "${appStoreData.app.name}" by ${appStoreData.app.developer} — avg rating ${appStoreData.app.rating?.toFixed(1)} from ${appStoreData.app.reviews?.toLocaleString()} reviews`
    : "No strong App Store competitor found — potential whitespace.";

  const prompt = `You are a sharp product strategist and market researcher. Analyze the following signals for the niche: "${query}"

APP STORE INTELLIGENCE:
${appInfo}

LOW-RATED REVIEWS (pain signals):
${reviewSummary || "No low-rated reviews found."}

REDDIT — GENERAL DEMAND SIGNALS:
${redditSummary || "No general Reddit posts found."}

REDDIT — RAW DEMAND EXPRESSIONS ("is there an app" / "why doesn't X exist"):
${demandSummary || "No direct demand expressions found."}

The RAW DEMAND EXPRESSIONS are the purest signal — people explicitly saying a product they want doesn't exist. Weight these heavily. Extract the most compelling verbatim quotes for the demandQuotes field.

Respond with JSON only, no markdown fences:

{
  "opportunityScore": <integer 0-100>,
  "verdict": "<one punchy sentence>",
  "demandStrength": "<HIGH | MEDIUM | LOW>",
  "competitionLevel": "<SATURATED | MODERATE | THIN | ABSENT>",
  "topPainThemes": [
    { "theme": "<name>", "frequency": "<HIGH|MED|LOW>", "exactPhrases": ["<phrase 1>", "<phrase 2>"] }
  ],
  "missingFeatures": ["<feature 1>", "<feature 2>", "<feature 3>"],
  "positioningAngle": "<one-liner positioning statement>",
  "targetAudience": "<specific description>",
  "redditInsight": "<most revealing general signal>",
  "demandQuotes": [
    { "quote": "<verbatim or near-verbatim>", "type": "<seeking|lamenting>", "upvotes": <number> }
  ],
  "buildRecommendation": "<specific 1-2 core features that would win>",
  "warnings": ["<risk 1>", "<risk 2>"]
}`;

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  let fullText = "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      try {
        const json = JSON.parse(line.slice(6));
        if (json.type === "content_block_delta") {
          fullText += json.delta?.text || "";
          onChunk(fullText);
        }
      } catch {}
    }
  }

  try {
    return JSON.parse(fullText.replace(/```json|```/g, "").trim());
  } catch { return null; }
}

// ── Main page component ────────────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState(null);
  const [demandCount, setDemandCount] = useState(0);
  const [appData, setAppData] = useState(null);
  const [streamText, setStreamText] = useState("");
  const [history, setHistory] = useState([]);

  const run = async () => {
    if (!query.trim() || phase === "fetching" || phase === "synthesizing") return;
    setResult(null); setStreamText(""); setAppData(null); setDemandCount(0);

    try {
      setPhase("fetching");
      setPhaseLabel("Scanning Reddit for pain signals + demand expressions…");

      const [redditPosts, demandPosts, appStoreData] = await Promise.all([
        fetchRedditSignals(query),
        fetchRedditDemandSignals(query),
        fetchAppStoreSignals(query),
      ]);

      setDemandCount(demandPosts.length);
      setAppData(appStoreData.app);
      setPhase("synthesizing");
      setPhaseLabel("Synthesizing gap analysis…");

      const analysis = await synthesizeWithClaude(
        query, redditPosts, demandPosts, appStoreData,
        (partial) => setStreamText(partial)
      );

      if (analysis) {
        setResult(analysis);
        setHistory(h => [{ query, analysis }, ...h.slice(0, 4)]);
        setPhase("done");
      } else {
        setPhase("error");
      }
    } catch (e) {
      console.error(e);
      setPhase("error");
    }
  };

  const demandColor = (d) => d === "HIGH" ? C.green : d === "MEDIUM" ? C.orange : C.red;
  const compColor = (c) => c === "ABSENT" || c === "THIN" ? C.green : c === "MODERATE" ? C.orange : C.red;
  const busy = phase === "fetching" || phase === "synthesizing";

  return (
    <>
      <Head>
        <title>Niche Gap Analyzer</title>
        <meta name="description" content="Find what people want that nobody's built yet." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>

        {/* Scanline */}
        <div style={{ position: "fixed", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,.012) 2px, rgba(255,255,255,.012) 4px)", pointerEvents: "none", zIndex: 0 }}/>
        {/* Glow */}
        <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}18 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }}/>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

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
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, fontWeight: 500 }}>
                Niche Gap Analyzer
              </span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 12 }}>
              Find what people want<br/>
              <em style={{ color: C.accent }}>that nobody's built yet.</em>
            </h1>
            <p style={{ color: C.textDim, fontSize: 15, maxWidth: 480, lineHeight: 1.6 }}>
              Cross-references Reddit pain signals with App Store competitive gaps to surface validated, underserved niches.
            </p>
          </div>

          {/* Search */}
          <div style={{ animation: "fadeUp .6s .1s ease both" }}>
            <div style={{
              display: "flex", border: `1px solid ${busy ? C.accent : C.borderLit}`,
              borderRadius: 6, overflow: "hidden", transition: "border-color .3s",
              boxShadow: busy ? `0 0 0 3px ${C.accent}22` : "none",
            }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && run()}
                placeholder="e.g. sleep tracking, freelance invoicing, ADHD productivity…"
                style={{ flex: 1, background: C.surface, border: "none", outline: "none", color: C.text, fontSize: 15, padding: "16px 20px", fontFamily: "'DM Sans', sans-serif" }}
              />
              <button onClick={run} disabled={!query.trim() || busy} style={{
                background: query.trim() ? C.accent : C.muted, color: C.bg, border: "none",
                cursor: query.trim() && !busy ? "pointer" : "default",
                padding: "16px 28px", fontFamily: "'DM Mono', monospace",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                transition: "background .2s", whiteSpace: "nowrap",
              }}>
                {busy ? <Pulse /> : "Analyze"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {["sleep tracking", "ADHD focus", "freelance invoicing", "meal planning", "habit tracking"].map(ex => (
                <button key={ex} onClick={() => setQuery(ex)} style={{
                  background: "none", border: `1px solid ${C.border}`, color: C.textDim,
                  fontSize: 12, padding: "4px 10px", borderRadius: 3, cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", transition: "border-color .2s, color .2s",
                }}
                  onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textDim; }}
                >{ex}</button>
              ))}
            </div>
          </div>

          {/* Status bar */}
          {busy && (
            <div style={{ marginTop: 32, padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 12, animation: "fadeUp .3s ease both" }}>
              <Pulse />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textDim }}>{phaseLabel}</span>
              {demandCount > 0 && <span style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.accent }}>{demandCount} demand expressions found</span>}
            </div>
          )}

          {/* Stream preview */}
          {phase === "synthesizing" && streamText && (
            <div style={{ marginTop: 12, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textDim, lineHeight: 1.7, maxHeight: 120, overflow: "hidden", maskImage: "linear-gradient(to bottom, black 60%, transparent)" }}>
              {streamText.slice(-400)}
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div style={{ marginTop: 32, padding: 20, border: `1px solid ${C.red}44`, background: `${C.red}11`, borderRadius: 6, color: C.red, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
              Analysis failed. Check your connection and try again.
            </div>
          )}

          {/* Results */}
          {phase === "done" && result && (
            <div style={{ marginTop: 40, animation: "fadeUp .5s ease both" }}>

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
                        {t.exactPhrases?.map((p, j) => (
                          <span key={j} style={{ fontSize: 11, color: C.textDim, fontFamily: "'DM Mono', monospace", background: C.border, padding: "2px 7px", borderRadius: 2 }}>"{p}"</span>
                        ))}
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                    {result.demandQuotes.map((q, i) => (
                      <div key={i} style={{ padding: "12px 14px", background: C.bg, border: `1px solid ${q.type === "seeking" ? C.accent + "33" : C.orange + "33"}`, borderRadius: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: q.type === "seeking" ? C.accent : C.orange }}>
                            {q.type === "seeking" ? "↗ seeking" : "↘ lamenting"}
                          </span>
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

              {/* App competitor */}
              {appData && (
                <div style={{ marginTop: 16, padding: "16px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
                  {appData.icon && <img src={appData.icon} alt={appData.name} style={{ width: 40, height: 40, borderRadius: 8 }} />}
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>Top Competitor Found</div>
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
                  <button key={i} onClick={() => { setQuery(h.query); setResult(h.analysis); setPhase("done"); }} style={{
                    background: C.surface, border: `1px solid ${C.border}`, color: C.textDim,
                    fontSize: 12, padding: "6px 14px", borderRadius: 4, cursor: "pointer",
                    fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ color: h.analysis.opportunityScore >= 70 ? C.green : h.analysis.opportunityScore >= 45 ? C.orange : C.red, fontSize: 10 }}>●</span>
                    {h.query} <span style={{ color: C.muted }}>{h.analysis.opportunityScore}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 60, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>SOURCES: Reddit API · App Store RSS · Claude Synthesis</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.muted }}>v0.1 · jasonpfields.com</span>
          </div>

        </div>
      </div>
    </>
  );
}
