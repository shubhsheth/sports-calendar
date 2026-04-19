# Plan: Calendar Sync Backend

## Overview

Six sequential phases. Each phase must build and pass its verification step before the next begins. Phases D–F (ESPN fetchers, worker core, routes) contain parallel tracks within them.

```
A: Monorepo foundation
   ↓
B: packages/shared — types, filters, ICS transforms
   ↓
C: Frontend wiring (update imports to shared package)
   ↓
D: packages/worker — ESPN fetchers          ← parallel: D1 D2 D3 can run together
   ↓
E: packages/worker — core (params, CORS, entry)
   ↓
F: packages/worker — routes                 ← parallel: F1 F2 F3 F4 can run together
   ↓
G: Tests
   ↓
H: Wrangler config + deploy
```

---

## Phase A — Monorepo Foundation

**Goal:** Make the repo an npm workspace so `packages/*` are resolvable as local packages.

**Changes:**
- Root `package.json`: add `"workspaces": ["packages/*"]`
- Root `tsconfig.json`: add path alias `"@sports-calendar/shared": ["packages/shared/src/index.ts"]`
- Create `packages/shared/package.json` — name `@sports-calendar/shared`, `"main": "src/index.ts"`, no build step (consumed via TypeScript path alias)
- Create `packages/shared/tsconfig.json` — extends root, references `src/`
- Create `packages/worker/package.json` — name `@sports-calendar/worker`, deps: `hono`, `ics`, workspace dep on `@sports-calendar/shared`
- Create `packages/worker/tsconfig.json` — extends root, CF Workers lib types

**Verification:** `npm install` from root succeeds; `packages/shared` and `packages/worker` appear in `node_modules/@sports-calendar/`.

---

## Phase B — Shared Package

**Goal:** Extract all league-agnostic logic that both the frontend and worker will use.

**What moves to `packages/shared/src/`:**

| Source (frontend) | Destination (shared) | Notes |
|---|---|---|
| `src/types/base.ts` | `types/base.ts` | Verbatim copy |
| `src/types/nba.ts` | `types/nba.ts` | Verbatim copy |
| `src/types/nfl.ts` | `types/nfl.ts` | Verbatim copy |
| `src/types/f1.ts` | `types/f1.ts` | Verbatim copy |
| `src/types/ipl.ts` | `types/ipl.ts` | Verbatim copy |
| `src/lib/eventStatus.ts` | `lib/eventStatus.ts` | Verbatim copy |
| `src/components/*/utils/*Duration.ts` | `lib/durations.ts` | Consolidate all 4 into one file |
| `src/components/f1/utils/translateF1*.ts` | `lib/f1Helpers.ts` | Verbatim copy |
| `src/components/*/utils/filter*.ts` | `filters/nba.ts` etc. | Update import paths only |
| `src/components/*/utils/transform*ToIcs.ts` | `ics/nba.ts` etc. | Update import paths only |

**`packages/shared/src/index.ts`** re-exports everything.

**Important:** Frontend source files are **not deleted** in this phase — both paths coexist until Phase C confirms imports work.

**Verification:** `tsc --noEmit` from `packages/shared` passes with zero errors.

---

## Phase C — Frontend Wiring

**Goal:** Frontend imports types and shared logic from `@sports-calendar/shared` rather than local paths, confirming the shared package is a drop-in replacement.

**Changes:**
- Update `vite.config.ts` to resolve `@sports-calendar/shared` via the TypeScript path alias (already in tsconfig, Vite needs `resolve.alias` or `vite-tsconfig-paths` plugin)
- Update imports in `src/components/*/utils/filter*.ts` → import types from `@sports-calendar/shared`
- Update imports in `src/components/*/utils/transform*ToIcs.ts` → same
- Update imports in `src/routes/*.tsx` as needed
- Delete the now-redundant local copies in `src/types/` **only after** confirming the build passes

**Verification:** `npm run build` (Vite) succeeds with zero TypeScript errors. App loads in browser (`npm run dev`).

---

## Phase D — Worker ESPN Fetchers

**Goal:** Port the ESPN API fetch logic to `packages/worker/src/espn/` using only Web APIs (no Node.js built-ins).

**Three files, can be written in parallel:**

### D1 — `fetchEventRefs.ts`
Adapts `src/api/espn/fetchEventRefs.ts`. Uses global `fetch`. Returns `{ items: EventRef[], pageCount, pageIndex }`. Includes `mapWithConcurrency` utility (copied from `download-ical-button.tsx`).

### D2 — `fetchEventDetails.ts`
Adapts `src/api/espn/fetchEventDetails.ts`. Generic `fetchEventDetails<T>(url: string): Promise<T>`.

### D3 — `fetchIplEvents.ts`
Adapts `src/components/ipl/utils/fetchIplEvents.ts`. Iterates date range 2026-03-28 to 2026-06-01, fetching one day at a time with concurrency cap 8.

**Per-league fetch orchestrators** (also in `espn/`):
- `fetchAllNbaEvents()` — pages through all season type IDs [2, 3], fetches all event details
- `fetchAllNflEvents()` — season type IDs [1, 2, 3]
- `fetchAllF1Events()` — season type ID [2]
- `fetchAllIplEvents()` — date range iteration

**Risk:** ESPN APIs may behave differently when called from CF edge IPs. Mitigation: verify in `wrangler dev` with real ESPN calls before writing route handlers.

**Verification:** Manual `wrangler dev` test — calling each fetch orchestrator returns a non-empty array of typed events.

---

## Phase E — Worker Core

**Goal:** Shared infrastructure all routes depend on.

### E1 — `params.ts`
Query param parsing and validation for all four leagues. Returns `ParseResult<T>` discriminated union.

```typescript
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

parseNbaParams(query)  // → ParseResult<NbaEventFilters>
parseNflParams(query)  // → ParseResult<NflEventFilters>
parseF1Params(query)   // → ParseResult<F1EventFilters>
parseIplParams(query)  // → ParseResult<IplEventFilters>
```

Validation rules:
- `teamIds`: comma-separated; each segment must be a non-empty string (not validated as numeric — ESPN IDs are strings)
- `showPastEvents`: must be `"true"` or `"false"` if present; defaults to `true`
- `types` (F1): each value must be one of `["1","2","3","4","6"]`

### E2 — `index.ts` (Hono app entry)
- Register Hono CORS middleware (`Access-Control-Allow-Origin: *`)
- Mount routes: `/calendar/nba.ics`, `/calendar/nfl.ics`, `/calendar/f1.ics`, `/calendar/ipl.ics`
- 404 handler for unmatched routes

### E3 — `cache.ts` (CF Cache API wrapper)
Thin wrapper around `caches.default` that gracefully no-ops when running outside CF (local Vitest, non-CF environments):

```typescript
async function withCache(key: string, ttl: number, fn: () => Promise<string>): Promise<string>
```

**Verification:** `wrangler dev` responds to `OPTIONS /calendar/nba.ics` with 204 and CORS headers. Unknown routes return 404.

---

## Phase F — Worker Routes

**Goal:** Four route handlers, each following the same pattern. Can be implemented in parallel after E is complete.

Each route:
1. Parses + validates query params → 400 on failure
2. Checks CF Cache API for a cached response
3. Fetches all events from ESPN
4. Filters using `@sports-calendar/shared` filter function
5. Transforms using `@sports-calendar/shared` ICS transform function
6. Calls `createEvents()` from `ics` package → 500 on failure
7. Builds response with `icsHeaders()` (`Content-Type: text/calendar`, `Cache-Control: public, max-age=3600`, `REFRESH-INTERVAL: PT1H`)
8. Stores in CF Cache API via `waitUntil`

**FR-5 additions** (not currently in frontend transforms — add in the shared `ics/` functions):
- `uid`: `"{eventId}@sports-calendar"`
- `description`: league + teams + status string

**Verification:** `wrangler dev` — each route returns a syntactically valid `.ics` file (validate with [ical.tools](https://ical.tools) or `node-ical` parse check in tests).

---

## Phase G — Tests

**Goal:** Verify filter logic correctness and route output validity.

### G1 — `packages/shared` unit tests (Vitest)
- Filter functions: test `showPastEvents=false` removes past events; `teamIds` filters correctly; empty `teamIds` returns all; F1 `types` filter works
- Param parsing: valid inputs parse correctly; invalid inputs return `{ ok: false }`
- Location: colocated `*.test.ts` next to source files

### G2 — `packages/worker` integration tests (`@cloudflare/vitest-pool-workers`)
- Mock ESPN API responses with `msw` (or manual `fetch` mock)
- Assert each route returns `Content-Type: text/calendar`
- Assert ICS contains `BEGIN:VCALENDAR`, `BEGIN:VEVENT`, `UID:`, `DTSTART:`
- Assert HTTP 400 on bad params, HTTP 200 on valid params

**Verification:** `npm test -w packages/shared` and `npm test -w packages/worker` both pass.

---

## Phase H — Wrangler Config & Deploy

**Goal:** `wrangler.toml` configured and worker deployed to CF.

**`packages/worker/wrangler.toml`:**
```toml
name = "sports-calendar-worker"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
```

**Deploy command:** `npx wrangler deploy` from `packages/worker/`.

**Verification:** Live worker URL responds to `/calendar/nba.ics` with a valid ICS. Subscribe URL works in Apple Calendar.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `ics` package uses Node.js built-ins incompatible with CF Workers | Low | `ics` is pure JS; verify in Phase D with `wrangler dev`. Fall back to hand-rolled RFC 5545 string if needed. |
| ESPN APIs blocked from CF edge IPs | Low | Test in Phase D with real `wrangler dev` calls. Can proxy via a public CORS proxy as fallback. |
| CF Cache API unavailable in local dev | Certain | Phase E3 wrapper silently skips cache when `caches` is unavailable — confirmed CF behavior. |
| Worker CPU time exceeded (30ms free-tier limit) | Medium | Network I/O doesn't count against CPU time. Actual computation (filter + ICS gen) is under 1ms. Monitor after deploy. |
| Frontend build breaks after Phase C import migration | Low | Run `npm run build` as the Phase C verification gate before deleting old files. |
