# Niche Gap — Private Ops Notes

> **Keep this file local. Never commit to GitHub.**
> Add `PRIVATE-OPS.md` to `.gitignore` if not already there.

---

## Live URLs

- Production: https://niche-gap.vercel.app
- GitHub repo: https://github.com/fasonista71/niche-gap-analyzer
- Vercel dashboard: https://vercel.com/fasonista71s-projects/niche-gap

---

## Stack

- **Framework:** Next.js 14 (React)
- **Hosting:** Vercel (fasonista71s-projects team)
- **AI:** Anthropic Claude API — claude-sonnet-4-20250514
- **Data sources:** Reddit public JSON API, Apple iTunes Search + RSS API
- **Proxy routes:** `/api/claude`, `/api/reddit`

---

## Environment variables

Set in Vercel dashboard → Project → Settings → Environment Variables.
Also set locally in `.env.local` (never committed).

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Local development

```bash
cd ~/Downloads/niche-gap
npm install
cp .env.example .env.local
# Add ANTHROPIC_API_KEY to .env.local

npm run dev
# http://localhost:3000
```

---

## Deploying changes

```bash
cd ~/Downloads/niche-gap

# 1. Drop updated index.js into pages/index.js
# 2. Commit and push
git add .
git commit -m "description of change"
git push

# 3. Deploy
vercel --prod
```

If Vercel CLI throws an error, try:
```bash
vercel logout
vercel login   # use GitHub auth
vercel --prod
```

Repo must be **public** on GitHub for Vercel free tier to auto-build.

---

## API costs (rough estimates)

| Operation | Tokens (approx) | Cost per call |
|-----------|----------------|---------------|
| B2C/B2B analysis | ~2,000 in + 1,500 out | ~$0.015 |
| Discovery domain scan | ~1,500 in + 2,500 out | ~$0.018 |
| Zeitgeist scan | ~2,000 in + 4,000 out | ~$0.028 |
| Competitive landscape | ~3,000 in + 2,500 out | ~$0.025 |

At current Claude Sonnet pricing. Monitor at console.anthropic.com.

---

## Monetization plan (future)

- 3 free analyses on signup
- Credit packs: $9 / 10 credits, $19 / 25 credits, $49 / 60 credits
- Auth: Clerk (Google + Apple sign-in)
- Payments: Stripe Payment Links → success page writes credits to Clerk user metadata
- Webhook: Stripe webhook for reliable post-payment credit assignment
- Spec doc: see `MONETIZATION-SPEC.md` (to be created)

---

## Known issues / gotchas

- Reddit rate limits: proxy routes through Vercel sometimes get 429. B2C/B2B make 2-3 calls and are fine. Discovery tab uses Claude only (no Reddit) to avoid this.
- Emoji in prompts: composite emoji (zero-width joiner sequences) break JSON encoding. Strip with `/[\uD800-\uDFFF]/g` before API calls — already implemented in `streamClaude()`.
- JSON truncation: long responses (Zeitgeist, landscape) need high `max_tokens`. Zeitgeist uses 8000, landscape uses 5000.
- Repo must be public for Vercel free tier deployment.

---

## File structure

```
niche-gap/
├── pages/
│   ├── index.js          # Main app — all components in one file
│   ├── _app.js           # Global styles import
│   └── api/
│       ├── claude.js     # Anthropic proxy (keeps API key server-side)
│       └── reddit.js     # Reddit proxy (browser CORS workaround)
├── styles/
│   └── globals.css
├── .env.example          # Template — copy to .env.local
├── .env.local            # Real keys — never committed
├── .gitignore
├── next.config.js
├── package.json
└── README.md             # Public-facing, generic
```

---

*Last updated: April 2026*
