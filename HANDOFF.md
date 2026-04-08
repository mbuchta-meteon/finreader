# Finance App — Session Handoff
_Read this at the start of every new chat session._

---

## What we are building
AI-powered personal finance analyzer. Upload PDF/image/CSV → AI vision/text analysis → full dashboard with spending breakdown, subscriptions, regular payments, investments, transfers, monthly trends. EN/CS localisation. Freemium business model with Stripe payments.

---

## Tech stack
| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict, 0 errors) |
| Styling | Inline styles (no Tailwind — PostCSS issue bypassed) |
| AI providers | Claude Sonnet 4, Claude Haiku 4.5, Gemini 2.5 Flash |
| File pipeline | Vision API direct (PDF/image) or text (CSV/TXT) — no OCR step |
| Charts | recharts (PieChart, LineChart) |
| i18n | Custom src/lib/i18n.ts (EN + CS) |
| Auth | NextAuth v5 (Google + GitHub OAuth + Resend magic link) |
| DB | SQLite via better-sqlite3 (data/finance.db) |
| Payments | Stripe (NOT YET implemented) |

---

## Project location
```
D:\ai\finance-app\
```

---

## Current state ✅

### All working
- PDF / image / CSV / TXT upload → AI analysis → full dashboard
- Vision pipeline: Gemini native PDF/image, Claude/Haiku pdfjs text + vision for images
- Auth: Google ✅ GitHub ✅ Resend magic link ✅ (needs finreader.app DNS verification to send to any email)
- Free tier — 3 blocking layers: IP fingerprint + account owner name + file size (2MB)
- Cloudflare Turnstile CAPTCHA (real keys set) + honeypot field
- Rate limiting: 5 req/min anonymous, 60 req/min Pro (in-memory, src/lib/rate-limit.ts)
- Session-aware UI: free banner, sign in, Pro model selector
- Models shown as "Standard" / "Better" — no model names exposed to users
- Admin dashboard at /ops-dashboard (password: ADMIN_SECRET env var)
  - Stats: total users, pro users, analyses, free tier usage
  - User table with → Pro / → Free role buttons
- Account page at /account
  - Storage opt-in toggle (GDPR compliant, default OFF)
  - Analysis history list with delete (Pro + opt-in only)
  - Sign out
- Privacy Policy at /privacy (GDPR compliant, Czech law)
- Terms of Service at /terms
- User in DB: majo buchta / buchtosik@gmail.com / role=free

### NOT yet implemented
- Stripe payments + webhook (role=pro on subscription)
- PDF export of dashboard
- Deploy to Vercel

---

## File structure
```
src/
  app/
    api/
      analyze/route.ts       — Main endpoint (auth, rate limit, CAPTCHA, free checks, vision/text)
      auth/[...nextauth]/    — NextAuth handler
      admin/
        stats/route.ts       — Admin stats (POST with secret)
        set-role/route.ts    — Admin set user role (POST with secret)
      user/
        analyses/route.ts    — User history CRUD (GET/DELETE/PATCH)
    auth/
      signin/page.tsx        — Sign in (Google + GitHub + magic link, dynamic)
      verify/page.tsx        — Magic link sent confirmation
      error/page.tsx         — Auth error page
    account/page.tsx         — Account settings + history (Pro)
    ops-dashboard/page.tsx   — Admin dashboard (password protected)
    privacy/page.tsx         — Privacy Policy (GDPR)
    terms/page.tsx           — Terms of Service
    globals.css
    layout.tsx               — SessionProvider wrapper
    page.tsx                 — Main page
  components/
    Dashboard.tsx            — Full results dashboard
    UploadZone.tsx           — Drag+drop upload
  lib/
    providers/
      claude.ts / haiku.ts / gemini.ts / vision-utils.ts
    ai-provider.ts           — AIProvider interface + parseJSON
    auth.ts                  — NextAuth config + SQLite adapter
    csv-parser.ts
    db.ts                    — SQLite schema + all helpers
    fingerprint.ts           — IP + UA fingerprint
    i18n.ts                  — EN + CS translations (all error keys included)
    prompt.ts                — buildPrompt + buildVisionPrompt
    rate-limit.ts            — In-memory rate limiter
    text-prepare.ts
    turnstile.ts             — Cloudflare Turnstile server-side verify
    types.ts
```

---

## Environment (.env.local) — all set ✅
```
ANTHROPIC_API_KEY         ✅
GEMINI_API_KEY            ✅
AUTH_SECRET               ✅
GOOGLE_CLIENT_ID/SECRET   ✅ working
GITHUB_CLIENT_ID/SECRET   ✅ working
RESEND_API_KEY            ✅ (magic link works for marian.buchta@meteon.cloud; add DNS for finreader.app to send to anyone)
EMAIL_FROM                onboarding@resend.dev (change to noreply@finreader.app after DNS)
ADMIN_SECRET              ✅
NEXT_PUBLIC_TURNSTILE_SITE_KEY  ✅
TURNSTILE_SECRET_KEY      ✅
```

---

## Business model
| Tier | Files | Model | Features |
|---|---|---|---|
| Free (anonymous) | 1, max 2MB | Standard | Full dashboard, 1 use per person |
| Pro €5/month | Unlimited | Standard + Better | History, multi-file, all features |

---

## Next steps (in order)
1. **Stripe** — create account, get keys, implement €5/month subscription + webhook
2. **PDF export** — export dashboard as PDF report (Pro feature)
3. **Deploy to Vercel** — push to GitHub, connect Vercel, set env vars

## Test scripts (D:\ai\crypto-fond\)
- `_test_owner_block.py` — 4/4 passing
- `_test_regex.py`       — 6/6 passing
- `_migrate_db.py`       — DB migration + clear free_usage
- `_start_server.py`     — Start dev server with log output
- `_check_db.py`         — Show DB state
