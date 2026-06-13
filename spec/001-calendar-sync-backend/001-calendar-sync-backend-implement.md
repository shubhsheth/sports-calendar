# Tasks: Calendar Sync Backend

Tasks are ordered by dependency. Complete each task's verification step before starting the next. Tasks marked **(parallel)** within a phase can be done simultaneously.

---

## Phase A — Monorepo Restructure

- [ ] **A1: Update root workspace config**
  - Acceptance: Root `package.json` has `"workspaces": ["shared", "client"]`; root `tsconfig.json` path alias updated to `"@sports-calendar/shared": ["shared/src/index.ts"]`
  - Verify: `npm install` completes without errors
  - Files: `package.json`, `tsconfig.json`

- [ ] **A2: Rename `packages/shared/` → `shared/`**
  - Acceptance: `shared/package.json` exists with `"name": "@sports-calendar/shared"`; `shared/tsconfig.json` extends root; `shared/src/index.ts` exists
  - Verify: `node_modules/@sports-calendar/shared` symlink resolves to `shared/`
  - Files: `shared/package.json`, `shared/tsconfig.json`

- [ ] **A3: Rename `src/` → `client/`**
  - Acceptance: `client/` contains all former `src/` files; `client/package.json` exists; `vite.config.ts` updated to resolve `@sports-calendar/shared` from `shared/src/index.ts`
  - Verify: `npm run build -w client` completes without module-not-found errors
  - Files: `client/package.json`, `vite.config.ts`

- [ ] **A4: Delete `packages/api/` and initialize Supabase**
  - Acceptance: `packages/api/` deleted; `supabase init` run from repo root (creates `supabase/config.toml`); `[functions.calendar] verify_jwt = false` added to `supabase/config.toml`; `supabase/functions/deno.json` created mapping `@sports-calendar/shared` to `../../shared/src/index.ts` (relative to `supabase/functions/`), plus `npm:` mappings for the shared package's runtime deps (`dayjs`, `ics`) and `"unstable": ["sloppy-imports"]` so Deno can consume the Node-style shared package (extensionless relative imports). Drift from the original `../../../shared/...` snippet — that path resolved one level above the repo root and omitted the npm/sloppy bridging Deno needs to type-check the shared graph
  - Verify: `supabase start` initializes without config errors
  - Files: `supabase/config.toml`, `supabase/functions/deno.json`

---

## Phase B — Shared Package (league-based layout)

- [x] **B1: Create `shared/src/espn/` base utilities** **(parallel with B2–B5)**
  - Acceptance: `shared/src/espn/fetchEventRefs.ts` exports `fetchEventRefsBySeason()`; `shared/src/espn/fetchEventDetails.ts` exports `fetchEventDetails<T>()`; `shared/src/espn/mapWithConcurrency.ts` exports `mapWithConcurrency()`; uses only standard `fetch` (no Node or CF-specific APIs)
  - Verify: `tsc --noEmit` from `shared/` passes
  - Files: `shared/src/espn/fetchEventRefs.ts`, `shared/src/espn/fetchEventDetails.ts`, `shared/src/espn/mapWithConcurrency.ts`

- [x] **B2: Populate `shared/src/nba/`** **(parallel with B1, B3–B5)**
  - Acceptance: `types.ts` mirrors former `src/types/nba.ts`; `filters.ts` exports `filterNbaEvents()`; `fetch.ts` exports `fetchAllNbaEvents()` using `espn/` base utilities with concurrency cap 8; `transform.ts` exports `transformNbaEventsToIcs()` with `uid: "{event.id}@sports-calendar"` and `description: "NBA: {teams} — {status}"` (FR-5)
  - Verify: `tsc --noEmit` from `shared/` passes
  - Files: `shared/src/nba/*.ts`

- [x] **B3: Populate `shared/src/nfl/`** **(parallel with B1, B2, B4, B5)**
  - Acceptance: Same as B2 for NFL; `fetch.ts` uses season types `[1, 2, 3]`
  - Verify: `tsc --noEmit` passes
  - Files: `shared/src/nfl/*.ts`

- [x] **B4: Populate `shared/src/f1/`** **(parallel with B1, B2, B3, B5)**
  - Acceptance: `types.ts` merges former `src/types/f1.ts` and all `translateF1*` helpers (no separate helpers file); `filters.ts` exports `filterF1Events()`; `fetch.ts` exports `fetchAllF1Events()` (season type `[2]`); `transform.ts` exports `transformF1EventsToIcs()` with FR-5 fields
  - Verify: `tsc --noEmit` passes
  - Files: `shared/src/f1/*.ts`

- [x] **B5: Populate `shared/src/ipl/`** **(parallel with B1, B2, B3, B4)**
  - Acceptance: `fetch.ts` exports `fetchAllIplEvents()` iterating date range 2026-03-28–2026-06-01 with concurrency cap 8; other files follow same pattern as B2
  - Verify: `tsc --noEmit` passes
  - Files: `shared/src/ipl/*.ts`

- [x] **B6: Add `eventStatus.ts` and wire `index.ts`**
  - Acceptance: `shared/src/eventStatus.ts` is a verbatim copy of former `src/lib/eventStatus.ts`; `shared/src/index.ts` re-exports all types, filter functions, fetch orchestrators, ICS transforms, espn utilities, and `eventStatus`
  - Verify: `tsc --noEmit` from `shared/` passes with zero errors; importing `{ filterNbaEvents, fetchAllNbaEvents, transformNbaEventsToIcs }` from `@sports-calendar/shared` resolves
  - Files: `shared/src/eventStatus.ts`, `shared/src/index.ts`

---

## Phase C — Frontend Wiring

- [x] **C1: Update client filter and transform imports**
  - Acceptance: All `filter*.ts` and `transform*ToIcs.ts` files under `client/src/components/*/utils/` import their types from `@sports-calendar/shared`; no logic changes
  - Verify: `npm run build -w client` succeeds; `npm run dev -w client` loads app without console errors
  - Files: `client/src/components/*/utils/filter*.ts`, `client/src/components/*/utils/transform*ToIcs.ts`

- [x] **C2: Update client ESPN API imports**
  - Acceptance: `client/src/api/espn/` imports base ESPN utilities from `@sports-calendar/shared` where applicable; or keeps local copies if frontend fetch patterns diverge (document the decision)
  - Verify: `npm run build -w client` succeeds
  - Files: `client/src/api/espn/*.ts`

- [x] **C3: Delete redundant client type files**
  - Acceptance: `client/src/types/` directory deleted; all former consumers import from `@sports-calendar/shared`; lint and build still pass
  - Verify: `npm run build -w client && npm run lint` both pass with zero errors
  - Files: `client/src/types/*.ts` (deleted)

---

## Phase D — Function-Specific Shared Code

- [x] **D1: `supabase/functions/_shared/params.ts`** **(parallel with D2)**
  - Acceptance: Exports `parseNbaParams`, `parseNflParams`, `parseF1Params`, `parseIplParams`; each returns `ParseResult<T>`; `showPastEvents` defaults to `true` when absent; invalid `types` values for F1 return `{ ok: false }`; empty `teamIds` is treated as no filter
  - Verify: `deno check supabase/functions/_shared/params.ts` passes
  - Files: `supabase/functions/_shared/params.ts`

- [x] **D2: `supabase/functions/_shared/icsHeaders.ts`** **(parallel with D1)**
  - Acceptance: Exports `icsHeaders()` returning a `Headers` object with `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: public, max-age=3600`, `Access-Control-Allow-Origin: *`
  - Verify: `deno check supabase/functions/_shared/icsHeaders.ts` passes
  - Files: `supabase/functions/_shared/icsHeaders.ts`

---

## Phase E — Edge Function Entry Point

- [x] **E1: `supabase/functions/calendar/index.ts`**
  - Acceptance: Hono app with CORS middleware; all 4 routes mounted (`/calendar/nba.ics`, `/calendar/nfl.ics`, `/calendar/f1.ics`, `/calendar/ipl.ics`); each route: parse params → 400 on failure → fetch ESPN → filter → transform → ICS → respond with `icsHeaders()`; 404 handler for unmatched routes; `Deno.serve(app.fetch)` as entry
  - Verify: `supabase functions serve` — `curl -X OPTIONS localhost:54321/functions/v1/calendar/calendar/nba.ics` returns 204 with `Access-Control-Allow-Origin: *`; `curl localhost:54321/functions/v1/calendar/unknown` returns 404
  - Files: `supabase/functions/calendar/index.ts`

- [x] **E2: Smoke-test each route**
  - Acceptance: Each of the 4 routes returns `Content-Type: text/calendar` and an ICS body containing `BEGIN:VCALENDAR`, `BEGIN:VEVENT`, `UID:`, `DTSTART:` against the live ESPN API via `supabase functions serve`
  - Verify: `curl "localhost:54321/functions/v1/calendar/calendar/nba.ics?showPastEvents=true"` returns valid ICS; same for nfl, f1, ipl
  - Files: none (verification only)

---

## Phase F — Supabase Config & Deploy

- [x] **F1: Finalize `supabase/config.toml`**
  - Acceptance: `supabase/config.toml` specifies `[functions.calendar] verify_jwt = false`; no secrets or project refs hardcoded
  - Verify: `supabase start` and `supabase functions serve` both start without config errors
  - Files: `supabase/config.toml`

- [x] **F2: Deploy to Supabase**
  - Acceptance: `supabase functions deploy calendar` succeeds; live function URL responds to `/calendar/nba.ics` with valid ICS
  - Verify: Subscribe URL added to Apple Calendar shows NBA events; same URL in Google Calendar shows the same events
  - Files: none (deploy only)

---

## Phase G — Tests

- [x] **G1: Shared package unit tests**
  - Acceptance: Vitest tests colocated in `shared/src/` cover: (a) `showPastEvents=false` removes past events; (b) `teamIds` filter excludes non-matching teams; (c) empty `teamIds` returns all events; (d) F1 `types` filter includes only specified session types; (e) valid params parse to `{ ok: true }`; (f) invalid `showPastEvents` value parses to `{ ok: false }`; (g) `mapWithConcurrency` respects the concurrency limit; (h) ESPN fetch orchestrators return typed arrays when `fetch` is mocked
  - Verify: `npm test -w shared` passes (cases a–d, g, h). NOTE: `params.test.ts` (cases e, f) lives under `supabase/functions/_shared/` (Deno function code, outside the `shared` workspace), so it runs via the root `npm run test:run` — vitest auto-collects it. Both suites green.
  - Files: `shared/src/nba/filters.test.ts`, `shared/src/f1/filters.test.ts`, `shared/src/espn/mapWithConcurrency.test.ts`, `supabase/functions/_shared/params.test.ts`

- [x] **G2: Edge Function integration tests**
  - Acceptance: Tests in `supabase/functions/calendar/` mock ESPN `fetch` responses (fixture JSON); assert: (a) each route returns `Content-Type: text/calendar`; (b) ICS body contains `BEGIN:VCALENDAR`, `BEGIN:VEVENT`, `UID:`, `DTSTART:`; (c) `?showPastEvents=invalid` returns 400; (d) valid params return 200
  - Verify: `deno test -A --config supabase/functions/deno.json supabase/functions/calendar/index.test.ts` — 2 tests green. NOTE: tests run via `app.request()` with a stubbed global `fetch` (fixtures), not a running `supabase start`; this is Docker-free, deterministic, and exercises the same Hono app. The function's only change is `export const app`; `Deno.serve` is stubbed during a dynamic import in the test so no port binds.
  - Files: `supabase/functions/calendar/index.test.ts`, `supabase/functions/calendar/fixtures/*.json`

---

## Phase H — CI/CD

- [x] **H1: Guard existing GH Pages workflows**
  - Acceptance: Root `test:run` and `lint` scripts scope to `shared/` and `client/` only; `deploy.yml` and `preview.yml` pass on CI after the monorepo restructure
  - Verify: Locally `npm run lint`, `npm run format:check`, `npm run test:run` (205), and `npm run build` all pass. Scoping is in place: `eslint.config.js` `globalIgnores(["dist","supabase/functions"])` and `.prettierignore` exclude the Deno function code; vitest excludes `supabase/functions/calendar/**`. NOTE: `test:run` also runs `supabase/functions/_shared/params.test.ts` (plain-TS param tests, intentional per G1) — client+shared plus that one file. Added `supabase/.temp` to `.prettierignore` so the local Supabase CLI artifact doesn't trip `format:check`.
  - Files: `.prettierignore`

- [x] **H2: Add `deploy-functions.yml` GitHub Actions workflow**
  - Acceptance: `.github/workflows/deploy-functions.yml` exists; triggers on push to `main` with path filter `supabase/functions/**` and `shared/**`; runs `supabase functions deploy calendar` using `SUPABASE_ACCESS_TOKEN` secret
  - Verify: YAML validated (parses; jobs=[deploy]; `on.push.paths`=`["supabase/functions/**","shared/**"]`); Prettier clean. Project ref `bnwiuipxyzwfcdpkkaln` is hardcoded (public — appears in the .ics URLs) so the only required repo secret is `SUPABASE_ACCESS_TOKEN`. NOTE: live "runs and succeeds" depends on the `SUPABASE_ACCESS_TOKEN` repo secret being set and a push to `main` touching the path filter; first real run is post-merge.
  - Files: `.github/workflows/deploy-functions.yml`
