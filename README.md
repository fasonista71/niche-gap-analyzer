# Niche Gap Analyzer

Find what people want that nobody's built yet.
Cross-references Reddit demand signals with App Store competitive gaps.

---

## Deploy to Vercel (first time)

### 1. Install prerequisites

```bash
# Install Node.js if you don't have it
# https://nodejs.org — download the LTS version

# Install Vercel CLI
npm install -g vercel
```

### 2. Get your Anthropic API key

Go to https://console.anthropic.com → API Keys → Create new key
Copy it — you'll need it in step 4.

### 3. Push to GitHub

```bash
cd niche-gap
git init
git add .
git commit -m "initial commit"
```

Create a new repo at github.com (call it `niche-gap-analyzer`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/niche-gap-analyzer.git
git push -u origin main
```

### 4. Deploy with Vercel

```bash
vercel
```

Follow the prompts:
- Set up and deploy? → Y
- Which scope? → your account
- Link to existing project? → N
- Project name → niche-gap-analyzer (or whatever you want)
- Directory → ./ (just hit enter)
- Override settings? → N

### 5. Add your API key as an environment variable

```bash
vercel env add ANTHROPIC_API_KEY
```

Paste your key when prompted. Select: Production, Preview, Development.

Then redeploy to pick it up:

```bash
vercel --prod
```

Your app is live at `https://niche-gap-analyzer.vercel.app` (or whatever name Vercel assigned).

---

## Local development

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

npm run dev
# Open http://localhost:3000
```

---

## Redeploying after changes

```bash
git add .
git commit -m "your change description"
git push
# Vercel auto-deploys on push if connected to GitHub
```

Or manually:
```bash
vercel --prod
```

---

## Stack

- Next.js 14 (React)
- Two API proxy routes: `/api/claude` and `/api/reddit`
- Reddit public JSON API (no auth required)
- Apple iTunes Search + RSS API (no auth required)
- Anthropic Claude API (key stored server-side only)
# Niche Gap Analyzer
