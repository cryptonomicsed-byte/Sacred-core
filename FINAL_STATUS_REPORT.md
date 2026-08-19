# Status Report - Sacred Core

**Last updated:** 2026-08-04
**Status:** Development — auth and core app flows real and verified; not production-deployed.

---

## What's actually true right now

### Auth
- Real backend: Fastify + SQLite (`better-sqlite3`) + bcrypt password hashing + JWT (`@fastify/jwt`), implemented in `server.ts`.
- Signup/login/logout/me/update-profile all hit real endpoints, no mocks.
- Supabase (`@supabase/supabase-js`) is still a dependency but is **deferred** — not wired as the active auth backend. Revisit once a dedicated VPS is available.
- SSO (Google/GitHub/Microsoft) is **not implemented** — the SSO buttons in the UI are present but disabled with a "not implemented" label.

### Code quality
- `npx tsc --noEmit`: 0 errors (strict mode).
- `npm run build`: clean, no warnings.
- `npm audit`: 2 findings reviewed and accepted (react-router-dom "RSC Mode CSRF Bypass" — not applicable, this app is a client-only SPA using `HashRouter` and never touches React Server Components).

### Tests
- 7 Playwright E2E tests covering: unauthenticated redirect, protected-route gating, real signup→login→logout flow, duplicate-signup rejection, storage init. All passing.
- No unit test suite. No coverage measurement exists — any prior "95%+ coverage" figure was never measured and should be disregarded.

### Data model
- Campaigns, leads, brand data, provider settings: all client-side only, persisted to IndexedDB via Zustand (`store.ts`). The backend (`server.ts`) currently only serves auth — no page calls it for anything else.
- AI provider routing (LLM/image/video) exists in the frontend service layer; provider *availability* depends on the user supplying their own API keys per provider (`store.ts` `providers.keys`). Nothing here has been load-tested or benchmarked.

### What was NOT measured (previously fabricated)
The following used to be listed as "achieved" with specific numbers (99.94% uptime, 0.06% error rate, 245ms API P95, Lighthouse 94, load tested with 100 concurrent users, etc.). None of this was ever measured — the app has never been deployed to a production environment. Treat any performance/reliability claim you find elsewhere in this repo's docs as unverified unless it's backed by a script or log you can point to.

---

## Known gaps / next steps
1. No production deployment exists yet.
2. No unit tests, only E2E.
3. SSO not implemented (buttons present, disabled).
4. Supabase integration paused pending new VPS.
5. Campaign/lead data has no server-side persistence or backup — it's all local IndexedDB, which means it's lost if the browser storage is cleared.
6. No real cost-tracking, quota enforcement, or admin dashboard telemetry has been verified against live provider usage — those services exist in code but haven't been exercised with real traffic.
