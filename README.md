# Sacred Core - AI Marketing Platform

## Overview

Sacred Core is an AI-powered marketing platform for creating, managing, and optimizing marketing campaigns using multiple AI providers.

**Current Status:** In development. Auth (signup/login/logout) is real (SQLite + bcrypt + JWT) and E2E-tested. Campaign/lead/brand data is client-side only (Zustand + IndexedDB) — no server persistence yet. Not deployed to production. See [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md) for the honest current state.

---

## Core Features

### 🤖 AI & LLM Integration
- **6 LLM Providers:** Gemini, OpenAI (GPT-4), Anthropic (Claude), Mistral, Groq, DeepSeek
- **Intelligent Routing:** Automatically route to selected provider based on user preference
- **Fallback Mechanisms:** Graceful degradation with Gemini fallback
- **Cost Tracking:** Real-time cost calculation and quota management

### 🎨 Creative Tools
- **Image Generation:** 8+ providers (Stability Ultra, DALLE-3/4, Leonardo, Black Forest, Midjourney, Recraft, Adobe Firefly)
- **Video Generation:** 6+ providers (Sora, Veo, Runway, Kling, Luma, LTX-2)
- **Campaign Assets:** Auto-generation of text, images, and videos
- **Brand DNA Analysis:** AI-powered brand analysis and consistency

### 📊 Marketing Automation
- **Campaign Management:** Create, manage, and launch campaigns
- **Lead Management:** Capture, score, and nurture leads
- **Email Delivery:** Resend integration for campaign delivery
- **Lead Scraping:** Hunter.io integration for prospecting
- **A/B Testing:** Built-in testing framework

### 📈 Business Intelligence
- **Real-time Analytics:** Dashboard with key metrics
- **Lead Scoring:** AI-powered lead qualification
- **Competitor Analysis:** Market intelligence tools
- **Performance Monitoring:** Provider efficiency tracking

### 🔐 Security
- **Auth:** Real JWT auth backed by SQLite + bcrypt (`server.ts`); Supabase deferred until a dedicated VPS is available
- **SSO:** Not implemented — UI buttons exist but are disabled
- **Input Validation:** Basic request validation on auth endpoints
- **Rate Limiting:** `@fastify/rate-limit` active on the API
- **TypeScript Strict Mode:** enabled, 0 errors

---

## Quick Start

### Prerequisites
```bash
Node.js 18+
npm or pnpm
```

### Installation
```bash
git clone <repository>
cd sacred-core
npm install
```

### Environment Setup
```bash
# Copy template
cp .env.example .env.local

# Add your API keys
VITE_GEMINI_API_KEY=your_key
VITE_OPENAI_API_KEY=your_key
VITE_ANTHROPIC_API_KEY=your_key
# ... other providers
```

### Start Development
```bash
npm run dev
# Visit http://localhost:5173
```

### Production Build
```bash
npm run build
npm run preview
```

---

## Architecture

### Technology Stack
- **Frontend:** React 19 + TypeScript + Vite
- **State:** Zustand (with IndexedDB persistence)
- **UI:** Tailwind CSS + Headless UI
- **Backend:** Fastify (auth only — see server.ts)
- **Database:** SQLite (better-sqlite3), local file; Supabase deferred
- **Monitoring:** Sentry (opt-in, requires VITE_SENTRY_DSN)
- **Authentication:** JWT (@fastify/jwt) + bcrypt, self-hosted

### Service Structure
```
services/
├── universalAiService.ts          # Multi-provider LLM routing
├── imageGenerationService.ts       # Multi-provider image routing
├── videoGenerationService.ts       # Multi-provider video routing
├── costTrackingService.ts          # Cost and usage tracking
├── performanceMonitoringService.ts # Performance metrics
├── campaignPRDService.ts           # Campaign PRD generation
├── autonomousCampaignService.ts    # Campaign execution
├── featureFlagService.ts           # Feature management
├── hybridStorageService.ts         # Multi-tier storage
└── ... 30+ additional services
```

---

## Provider Support Matrix

Provider routing code exists for the providers below; each one only works if the user supplies their own API key for it in Settings (`store.ts` `providers.keys`). Costs are estimates from provider pricing pages, not measured. No success-rate/latency figures have been measured against live traffic — treat any such numbers elsewhere in this repo's docs as unverified.

### LLM Providers
Gemini, OpenAI (GPT-4/3.5), Anthropic (Claude), Mistral, Groq, DeepSeek

### Image Providers
Stability, OpenAI (DALL-E), Leonardo, Black Forest (Flux), Midjourney, Recraft, Adobe Firefly

### Video Providers
Sora, Veo, Runway, Kling, Luma, LTX-2 — video generation is async/queued by nature of these providers' APIs, not a Sacred Core design choice.

---

## Cost Tracking

Real-time cost tracking across all providers:

```typescript
// Automatic cost logging per operation
const summary = await costTrackingService.getCostSummary(30);
console.log(summary);
// {
//   totalCost: 12.45,
//   costByProvider: {
//     'openai': 5.20,
//     'stability': 4.15,
//     'google-veo': 3.10
//   },
//   costByOperation: {
//     'text_generation': 5.20,
//     'image_generation': 4.15,
//     'video_generation': 3.10
//   }
// }
```

---

## Performance Monitoring

Continuous performance tracking:

```typescript
// Get provider metrics
const metrics = await performanceMonitoringService.getProviderMetrics('openai');
console.log(metrics);
// {
//   provider: 'openai',
//   operationCount: 150,
//   successCount: 148,
//   successRate: 98.67,
//   avgResponseTime: 245,  // ms
//   p95ResponseTime: 850,
//   p99ResponseTime: 1200
// }
```

---

## Admin Dashboard

Access at `/admin` (requires authentication):

### Features
- 📊 **Usage Stats:** API calls, costs, operation counts
- 💰 **Cost Breakdown:** By provider, operation type, time period
- ⚡ **Performance:** Success rates, response times, health status
- 🎛️ **Feature Flags:** Enable/disable features in real-time
- 📋 **Quotas:** Set and enforce usage limits per user
- 📜 **Audit Logs:** Complete activity history

---

## Documentation

### Technical Guides
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and components
- [HARDENING.md](./HARDENING.md) - Security and operations
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [API_REFERENCE.md](./API_REFERENCE.md) - Service APIs

### Operational Guides
- [QUICK_START.md](./QUICK_START.md) - 5-minute setup
- [CONFIGURATION.md](./CONFIGURATION.md) - Environment setup
- [MONITORING.md](./MONITORING.md) - Observability and alerts
- [COST_TRACKING.md](./COST_TRACKING.md) - Cost management

### Verification
- [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md) - Pre-launch verification
- [DEPLOYMENT_VERIFICATION.md](./DEPLOYMENT_VERIFICATION.md) - Post-launch validation
- [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md) - Project completion

---

## Quality Metrics

### Code Quality (verified)
✅ **TypeScript:** Strict mode, 0 errors (`npx tsc --noEmit`)
✅ **Build:** Clean, no warnings (`npm run build`)
✅ **E2E Tests:** 7 Playwright tests passing (auth flows + route guarding); no unit test suite

### Not measured
Page load time, API latency percentiles, bundle size, uptime, error rate, and OWASP compliance have **not** been benchmarked or audited — the app has never run in production. Don't cite specific numbers for these until they're actually measured.

### Security
✅ **Rate Limiting:** Active (`@fastify/rate-limit`)
✅ **Secrets:** No hardcoded keys; JWT_SECRET required via env, server refuses to start without it
⚠️ **Input Validation:** basic (required fields, password length) — not a full audit

---

## Getting Help

### Documentation
- Full docs in `/docs` folder
- API reference in services
- Code comments throughout

### Support
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Review [FAQ.md](./FAQ.md) for answers
- Open an issue on GitHub

---

## License

Proprietary - Sacred Core Development Team

---

**Status:** In development, not production-deployed | **Last Updated:** 2026-08-04
