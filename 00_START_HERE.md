# 🚀 SACRED CORE - START HERE
## AI Marketing Platform — In Development

**Status:** Auth + core app flows real and E2E-tested. Not production-deployed. **Date:** 2026-08-04

---

## What Is Sacred Core?

Sacred Core is an AI-powered marketing platform that lets teams create, manage, and optimize marketing campaigns using multiple AI providers (LLM, image, video).

**Quick Facts:**
- Real JWT auth (SQLite + bcrypt), backend in `server.ts`
- Provider routing code for 6 LLM / 8+ image / 6+ video providers — each requires the user's own API key, none of this has been load-tested
- Campaign/lead/brand data is client-side only (Zustand + IndexedDB), no server persistence
- TypeScript strict mode, 0 errors; 7 Playwright E2E tests passing; no unit test suite
- SSO not implemented (buttons present, disabled)

---

## 🎯 What You Can Do With It

- **Generate Campaigns** — text, images, videos via your own provider API keys
- **Track Costs** — cost-tracking service exists (unverified against live usage)
- **Route to Providers** — choose your preferred LLM, image, or video provider per brand
- **Manage Brand DNA / Leads** — stored locally in IndexedDB

---

## 📊 Current Status

| Aspect | Status | Details |
|--------|--------|---------|
| **Auth** | ✅ Real | SQLite + bcrypt + JWT, E2E-verified |
| **Code Quality** | ✅ Good | TypeScript strict, 0 errors; clean build |
| **Testing** | ⚠️ Partial | 7 E2E tests (auth/routing); no unit tests |
| **Performance** | ❓ Unmeasured | Never benchmarked or load-tested |
| **Security** | ⚠️ Basic | Rate limiting + bcrypt/JWT; no formal audit |
| **SSO** | ❌ Not implemented | UI present, disabled |
| **Deployment** | ❌ Not deployed | Dev-only so far |

---

## ⚡ Quick Start (5 Minutes)

### 1. Clone & Install
```bash
git clone <repo>
cd sacred-core
npm install
```

### 2. Configure
```bash
cp .env.example .env.local
# Set JWT_SECRET (required — server won't start without it)
# Add your AI provider API keys for the providers you want to use
```

### 3. Run
```bash
npm run dev:full
# Frontend: http://localhost:5173  |  API: http://localhost:4000
```

### 4. Create Campaign
- Sign up / log in (real auth now, not a mock)
- Go to Campaigns → Create New
- Set your LLM/image provider in Settings
- Generate campaign

---

## 📁 Documentation Guide

Other docs in this repo (ARCHITECTURE.md, DEPLOYMENT.md, MONITORING.md, HARDENING.md, etc.) were written aspirationally before the auth/backend rework and **have not been re-verified** — treat specific numbers or "complete"/"production-ready" claims in them as unverified until checked against the actual code. [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md) and this file are the two documents kept up to date with real state.

---

## 🎯 Provider Support (code exists, unverified at scale)

- **LLM:** Gemini, OpenAI, Claude, Mistral, Groq, DeepSeek
- **Image:** Stability, DALL-E, Leonardo, Black Forest, Midjourney, Recraft, Adobe Firefly
- **Video:** Sora, Veo, Runway, Kling, Luma, LTX-2 (async/queued by provider design)

Each provider only works if you supply your own API key for it. No success rates, latencies, or costs listed elsewhere in this repo have been measured — they were placeholder/fabricated numbers from an earlier draft.

---

## 🔐 Security — actual state

- ✅ Rate limiting active (`@fastify/rate-limit`)
- ✅ Passwords hashed with bcrypt (cost factor 12)
- ✅ JWT-based auth, server refuses to boot without `JWT_SECRET`
- ✅ No hardcoded secrets
- ❌ SSO not implemented
- ❓ No formal OWASP audit has been performed — don't cite "OWASP compliant" until one has

---

## 📞 Getting Help

- **"How do I get started?"** → Quick Start above
- **"What's the real status?"** → [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md)
- **"What's still missing?"** → See "Known gaps" in FINAL_STATUS_REPORT.md

---

**Project:** Sacred Core
**Status:** In development, not production-deployed
**Date:** 2026-08-04
