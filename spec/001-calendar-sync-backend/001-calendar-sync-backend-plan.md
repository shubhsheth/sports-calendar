# Plan: Calendar Sync Backend

## Overview

Six sequential phases. Each phase must build and pass its verification step before the next begins. Phases D and F contain parallel tracks within them.

```
A: Monorepo restructure (src/ → client/, packages/shared/ → shared/)
   ↓
B: shared/ — types, filters, ICS transforms, ESPN fetchers (reorganized by league)
   ↓
C: Frontend wiring (update client/ imports to new shared paths)
   ↓
D: functions/_shared/ — params, icsHeaders          ← parallel: D1 D2
   ↓
E: functions/calendar/index.ts — Hono app entry point
   ↓
F: Supabase config + deploy
   ↓
G: Tests
   ↓
H: CI/CD — guard existing GH Pages workflows + add deploy-functions.yml
```

---

## Phase A — Monorepo Restructure

**Goal:** Flatten the repo from `packages/*` workspaces to root-level `shared/` and `client/`. Add Supabase config.

**Changes:**
- Root `package.json`: change `"workspaces"` from `["packages/*"]` to `["shared", "client"]`
- Rename `packages/shared/` → `shared/`; update `shared/package.json` name to `@sports-calendar/shared`
- Rename `src/` → `client/`; update `client/package.json` name to `@sports-calendar/client`
- Delete `packages/api/` (replaced by `functions/`)
- Add `config.toml` at repo root with minimal Supabase project config
- Update root `tsconfig.json` path alias: `"@sports-calendar/shared": ["shared/src/index.ts"]`
- Update `vite.config.ts` `resolve.alias` (or `vite-tsconfig-paths`) to point at `shared/src/index.ts`

**Verification:** `npm install` from root succeeds; `shared/` and `client/` appear in `node_modules/@sports-calendar/`.

---

## Phase B — Shared Package (league-based layout)

**Goal:** Reorganize `shared/src/` by league and extend it to include ESPN fetchers. Each league directory owns its types, filters, ESPN fetch orchestrator, and ICS transform.

**New `shared/src/` layout:**

```
shared/src/
├── espn/
│   ├── fetchEventRefs.ts      ← adapted from src/api/espn/fetchEventRefs.ts
│   ├── fetchEventDetails.ts   ← adapted from src/api/espn/fetchEventDetails.ts
│   └── mapWithConcurrency.ts  ← extracted from download-ical-button.tsx
├── nba/
│   ├── types.ts               ← moved from src/types/nba.ts
│   ├── filters.ts             ← moved from src/components/nba/utils/filterNbaEvents.ts
│   ├── fetch.ts               ← fetchAllNbaEvents() (new — pages through season types [2,3])
│   └── transform.ts           ← moved from src/components/nba/utils/transformNbaEventsToIcs.ts
├── nfl/
│   ├── types.ts
│   ├── filters.ts
│   ├── fetch.ts               ← fetchAllNflEvents() (season types [1,2,3])
│   └── transform.ts
├── f1/
│   ├── types.ts               ← merged from src/types/f1.ts + translateF1* helpers
│   ├── filters.ts
│   ├── fetch.ts               ← fetchAllF1Events() (season type [2])
│   └── transform.ts
├── ipl/
│   ├── types.ts
│   ├── filters.ts
│   ├── fetch.ts               ← fetchAllIplEvents() (date range 2026-03-28–2026-06-01)
│   └── transform.ts
├── eventStatus.ts             ← moved from src/lib/eventStatus.ts
└── index.ts                   ← re-exports everything
```

**Migration table (from original `packages/shared/`):**

| Source | Destination | Notes |
|---|---|---|
| `src/types/base.ts` | `eventStatus.ts` + inline in league types | Base types absorbed |
| `src/types/nba.ts` | `nba/types.ts` | Verbatim copy |
| `src/types/nfl.ts` | `nfl/types.ts` | Verbatim copy |
| `src/types/f1.ts` | `f1/types.ts` | Verbatim copy |
| `src/types/ipl.ts` | `ipl/types.ts` | Verbatim copy |
| `src/lib/eventStatus.ts` | `eventStatus.ts` | Verbatim copy |
| `src/components/*/utils/filter*.ts` | `<league>/filters.ts` | Update import paths |
| `src/components/*/utils/transform*ToIcs.ts` | `<league>/transform.ts` | Update import paths; add `uid` + `description` |
| `src/components/*/utils/*Duration.ts` | `<league>/transform.ts` | Inline duration constants where used |
| `src/components/f1/utils/translateF1*.ts` | `f1/types.ts` | Merge into types file |
| `src/api/espn/fetchEventRefs.ts` | `espn/fetchEventRefs.ts` | Adapt to standard `fetch` (no CF-specific API) |
| `src/api/espn/fetchEventDetails.ts` | `espn/fetchEventDetails.ts` | Adapt to standard `fetch` |
| `mapWithConcurrency` (download-ical-button.tsx) | `espn/mapWithConcurrency.ts` | Extract to own file |
| `src/components/*/utils/fetchIplEvents.ts` | `ipl/fetch.ts` | Adapt, rename to `fetchAllIplEvents()` |
| *(new)* | `nba/fetch.ts` | `fetchAllNbaEvents()` — pages + resolves refs |
| *(new)* | `nfl/fetch.ts` | `fetchAllNflEvents()` |
| *(new)* | `f1/fetch.ts` | `fetchAllF1Events()` |

**`shared/src/index.ts`** re-exports all types, filters, ICS transforms, fetch orchestrators, espn utilities, and `eventStatus`.

**Important:** Frontend source files are **not deleted** in this phase — both paths coexist until Phase C confirms imports work.

**FR-5 additions** (add in `<league>/transform.ts`):
- `uid`: `"{event.id}@sports-calendar"`
- `description`: `"{league}: {teams} — {status}"` string

**Verification:** `tsc --noEmit` from `shared/` passes with zero errors.

---

## Phase C — Frontend Wiring

**Goal:** `client/` imports types and shared logic from `@sports-calendar/shared` (new league-based paths), confirming the shared package is a drop-in replacement.

**Changes:**
- Update imports in `client/src/components/*/utils/filter*.ts` → import types from `@sports-calendar/shared`
- Update imports in `client/src/components/*/utils/transform*ToIcs.ts` → same
- Update imports in `client/src/routes/*.tsx` as needed
- Update imports in `client/src/api/espn/` to use `@sports-calendar/shared` espn utilities (or keep local copies if frontend fetch patterns diverge)
- Delete the now-redundant local copies in `client/src/types/` **only after** confirming the build passes

**Verification:** `npm run build -w client` succeeds with zero TypeScript errors. App loads in browser.

---

## Phase D — Function-Specific Shared Code

**Goal:** Two files that are HTTP handler concerns only — never imported by `client/`.

**Two files, can be written in parallel:**

### D1 — `functions/_shared/params.ts`
Query param parsing and validation for all four leagues. Returns `ParseResult<T>` discriminated union.

```typescript
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

parseNbaParams(query)  // → ParseResult<NbaEventFilters>
parseNflParams(query)  // → ParseResult<NflEventFilters>
parseF1Params(query)   // → ParseResult<F1EventFilters>
parseIplParams(query)  // → ParseResult<IplEventFilters>
```

Validation rules:
- `teamIds`: comma-separated; each segment must be a non-empty string; empty string treated as no filter
- `showPastEvents`: must be `"true"` or `"false"` if present; defaults to `true`
- `types` (F1): each value must be one of `["1","2","3","4","6"]`

### D2 — `functions/_shared/icsHeaders.ts`
Returns a `Headers` object with `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: public, max-age=3600`, and `Access-Control-Allow-Origin: *`.

**Verification:** `tsc --noEmit` from `functions/` (using Deno check) passes.

---

## Phase E — Edge Function Entry Point

**Goal:** Hono app wiring all four routes. No cache logic.

**`functions/calendar/index.ts`:**
- Register Hono CORS middleware (`Access-Control-Allow-Origin: *`)
- Mount routes: `/calendar/nba.ics`, `/calendar/nfl.ics`, `/calendar/f1.ics`, `/calendar/ipl.ics`
- Each route: parse params → fetch ESPN (from `@sports-calendar/shared`) → filter → transform → ICS → respond
- 404 handler for unmatched routes
- `Deno.serve(app.fetch)` as entry point (replaces CF Worker `export default { fetch }`)

**Verification:** `supabase functions serve` — `OPTIONS /calendar/nba.ics` returns 204 with CORS headers. Unknown routes return 404.

---

## Phase F — Supabase Config & Deploy

**Goal:** `config.toml` configured and Edge Function deployed to Supabase.

**`config.toml` (repo root):**
```toml
[functions.calendar]
verify_jwt = false
```

**`functions/import_map.json`:**
```json
{
  "imports": {
    "@sports-calendar/shared": "../../shared/src/index.ts"
  }
}
```

**Deploy command:** `supabase functions deploy calendar` from repo root.

**Verification:** Live function URL responds to `/calendar/nba.ics` with a valid ICS. Subscribe URL works in Apple Calendar.

---

## Phase G — Tests

**Goal:** Verify filter logic correctness and route output validity.

### G1 — `shared/` unit tests (Vitest)
- Filter functions: `showPastEvents=false` removes past events; `teamIds` filters correctly; empty `teamIds` returns all; F1 `types` filter works
- Param parsing: valid inputs parse to `{ ok: true }`; invalid inputs return `{ ok: false }`
- ESPN fetch orchestrators: smoke tests with mocked `fetch` return typed arrays
- Location: colocated `*.test.ts` next to source files (e.g. `shared/src/nba/filters.test.ts`)

### G2 — `functions/calendar/` integration tests
- Use Supabase local dev (`supabase start`) with mocked ESPN responses
- Assert each route returns `Content-Type: text/calendar`
- Assert ICS contains `BEGIN:VCALENDAR`, `BEGIN:VEVENT`, `UID:`, `DTSTART:`
- Assert HTTP 400 on bad params, HTTP 200 on valid params

**Verification:** `npm test -w shared` passes; function integration tests pass against local Supabase.

---

## Phase H — CI/CD: GitHub Actions

**Goal:** Existing GitHub Pages workflows keep working after the monorepo restructure, and the Supabase Edge Function deploys automatically on push to `main`.

### H1 — Guard existing GH Pages workflows

Both `deploy.yml` and `preview.yml` run `npm run lint`, `npm run test:run`, and `npm run build` at the workspace root. After Phase A these should scope to `client/` and `shared/` only.

- Root `package.json` `test:run` script: scope to `npm run test:run -w shared && npm run test:run -w client`
- Root `package.json` `build` script: remains the Vite frontend build scoped to `client/`
- Confirm lint globs don't pick up `functions/` Deno code

**Verification:** Both `deploy.yml` and `preview.yml` pass on a test PR after Phase A lands.

### H2 — New `deploy-functions.yml` workflow

Triggers on push to `main` when `functions/` or `shared/` changes.

```yaml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'functions/**'
      - 'shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase functions deploy calendar
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Prerequisites:** `SUPABASE_ACCESS_TOKEN` must be added as a GitHub repository secret.

**Verification:** Pushing a change to `functions/` triggers the workflow and the live function URL serves an updated response.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `ics` npm package incompatible with Deno's `npm:` import | Low | `ics` is pure JS; verify with `deno run` locally before building routes. |
| ESPN APIs blocked from Supabase edge IPs | Low | Test in `supabase functions serve` with real ESPN calls during Phase E. |
| Hono `npm:hono` behaves differently from Node Hono | Low | Hono officially supports Deno; verify CORS middleware and route matching in Phase E. |
| Frontend build breaks after Phase C import migration | Low | Run `npm run build -w client` as Phase C verification gate before deleting old files. |
| Supabase Edge Function wall-clock limit (150s) | Low | ESPN full-season fetch is ~10s; well within limit. Monitor after deploy. |
| Deno can't resolve `@sports-calendar/shared` without import map | Certain | `functions/import_map.json` handles this; Node/Vite resolve via workspace symlinks. |
