# Tasks: Calendar Sync Backend

Tasks are ordered by dependency. Complete each task's verification step before starting the next. Tasks marked **(parallel)** within a phase can be done simultaneously.

---

## Phase A — Monorepo Foundation

- [ ] **A1: Convert root to npm workspace**
  - Acceptance: `package.json` has `"workspaces": ["packages/*"]`; `npm install` completes without errors
  - Verify: `ls node_modules/@sports-calendar/` shows `shared` and `worker` symlinks after A2–A3
  - Files: `package.json`

- [ ] **A2: Scaffold `packages/shared`**
  - Acceptance: `packages/shared/package.json` exists with `"name": "@sports-calendar/shared"`; `packages/shared/tsconfig.json` extends root tsconfig; `packages/shared/src/index.ts` exists (empty export for now)
  - Verify: `tsc --noEmit` from `packages/shared` passes
  - Files: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`

- [ ] **A3: Scaffold `packages/worker`**
  - Acceptance: `packages/worker/package.json` exists with `"name": "@sports-calendar/worker"` and deps `hono`, `ics`, `@sports-calendar/shared`; `packages/worker/tsconfig.json` references CF Workers types (`@cloudflare/workers-types`); `packages/worker/src/index.ts` exists with a minimal Hono app that returns 200
  - Verify: `npm run dev -w packages/worker` (`wrangler dev`) starts without errors; `curl localhost:8787` returns a response
  - Files: `packages/worker/package.json`, `packages/worker/tsconfig.json`, `packages/worker/wrangler.toml`, `packages/worker/src/index.ts`

---

## Phase B — Shared Package

- [ ] **B1: Copy types to shared** *(no logic changes)*
  - Acceptance: `packages/shared/src/types/` contains `base.ts`, `nba.ts`, `nfl.ts`, `f1.ts`, `ipl.ts` — verbatim copies from `src/types/`; all export the same symbols
  - Verify: `tsc --noEmit` from `packages/shared` passes
  - Files: `packages/shared/src/types/*.ts`

- [ ] **B2: Copy event status utilities and consolidate durations**
  - Acceptance: `packages/shared/src/lib/eventStatus.ts` is a verbatim copy of `src/lib/eventStatus.ts`; `packages/shared/src/lib/durations.ts` exports `NBA_DURATION_MINUTES`, `NFL_DURATION_MINUTES`, `IPL_DURATION_MINUTES`, and `F1_SESSION_DURATIONS` consolidated from the four per-sport files; `packages/shared/src/lib/f1Helpers.ts` is a verbatim copy of the F1 translate utilities
  - Verify: `tsc --noEmit` from `packages/shared` passes
  - Files: `packages/shared/src/lib/eventStatus.ts`, `packages/shared/src/lib/durations.ts`, `packages/shared/src/lib/f1Helpers.ts`

- [ ] **B3: Copy filter functions to shared** **(parallel with B4)**
  - Acceptance: `packages/shared/src/filters/` contains `nba.ts`, `nfl.ts`, `f1.ts`, `ipl.ts`; each exports the same function signature as the frontend originals; imports updated to use `../types/*` and `../lib/*` within the shared package
  - Verify: `tsc --noEmit` from `packages/shared` passes
  - Files: `packages/shared/src/filters/*.ts`

- [ ] **B4: Copy ICS transform functions to shared** **(parallel with B3)**
  - Acceptance: `packages/shared/src/ics/` contains `nba.ts`, `nfl.ts`, `f1.ts`, `ipl.ts`; each exports the same function signature as the frontend originals; additionally each event's `uid` is set to `"{event.id}@sports-calendar"` and `description` is set to a `"{league}: {teams} — {status}"` string (FR-5)
  - Verify: `tsc --noEmit` from `packages/shared` passes
  - Files: `packages/shared/src/ics/*.ts`

- [ ] **B5: Wire up shared `index.ts`**
  - Acceptance: `packages/shared/src/index.ts` re-exports all types, filters, ICS transforms, and lib utilities; importing `{ filterNbaEvents, transformNbaEventsToIcs, NbaEvent }` from `@sports-calendar/shared` resolves correctly
  - Verify: `tsc --noEmit` from `packages/shared` passes with zero errors
  - Files: `packages/shared/src/index.ts`

---

## Phase C — Frontend Wiring

- [ ] **C1: Add shared package resolution to Vite**
  - Acceptance: `vite.config.ts` resolves `@sports-calendar/shared` to `packages/shared/src/index.ts` (via `vite-tsconfig-paths` plugin or explicit `resolve.alias`); root `tsconfig.json` has the path alias
  - Verify: `npm run build` completes without module-not-found errors
  - Files: `vite.config.ts`, `tsconfig.json`

- [ ] **C2: Update frontend filter and transform imports**
  - Acceptance: All `filter*.ts` and `transform*ToIcs.ts` files under `src/components/*/utils/` import their types from `@sports-calendar/shared` instead of `@/types/*`; no other logic changes
  - Verify: `npm run build` succeeds; `npm run dev` loads the app without console errors
  - Files: `src/components/*/utils/filter*.ts`, `src/components/*/utils/transform*ToIcs.ts`

- [ ] **C3: Delete redundant frontend type files**
  - Acceptance: `src/types/` directory is deleted; all former consumers import from `@sports-calendar/shared`; frontend lint and build still pass
  - Verify: `npm run build && npm run lint` both pass with zero errors
  - Files: `src/types/*.ts` (deleted)

---

## Phase D — Worker ESPN Fetchers

- [ ] **D1: `fetchEventRefs.ts` + `mapWithConcurrency`** **(parallel with D2, D3)**
  - Acceptance: `packages/worker/src/espn/fetchEventRefs.ts` exports `fetchEventRefsBySeason(sportId, leagueId, seasonId, pagination)` returning `{ items: EventRef[], pageCount, pageIndex }`; `mapWithConcurrency` exported from `packages/worker/src/espn/utils.ts`; uses only global `fetch`, no Node.js imports
  - Verify: `tsc --noEmit` from `packages/worker` passes
  - Files: `packages/worker/src/espn/fetchEventRefs.ts`, `packages/worker/src/espn/utils.ts`

- [ ] **D2: `fetchEventDetails.ts`** **(parallel with D1, D3)**
  - Acceptance: `packages/worker/src/espn/fetchEventDetails.ts` exports generic `fetchEventDetails<T>(url: string): Promise<T>`; uses only global `fetch`
  - Verify: `tsc --noEmit` passes
  - Files: `packages/worker/src/espn/fetchEventDetails.ts`

- [ ] **D3: `fetchIplEvents.ts`** **(parallel with D1, D2)**
  - Acceptance: `packages/worker/src/espn/fetchIplEvents.ts` exports `fetchIplEventsByDate(dateStr: string): Promise<IplEvent[]>`; uses only global `fetch`
  - Verify: `tsc --noEmit` passes
  - Files: `packages/worker/src/espn/fetchIplEvents.ts`

- [ ] **D4: Per-league fetch orchestrators**
  - Acceptance: `packages/worker/src/espn/leagues.ts` exports `fetchAllNbaEvents()`, `fetchAllNflEvents()`, `fetchAllF1Events()`, `fetchAllIplEvents()` — each fetches all pages/dates and resolves all `$ref` event details using `mapWithConcurrency` with limit 8; return typed arrays using shared types
  - Verify: `wrangler dev` smoke test — hitting a temporary debug route that calls `fetchAllNflEvents()` returns a non-empty array in the response (remove debug route after verification)
  - Files: `packages/worker/src/espn/leagues.ts`

---

## Phase E — Worker Core

- [ ] **E1: Query param parsing (`params.ts`)**
  - Acceptance: `packages/worker/src/params.ts` exports `parseNbaParams`, `parseNflParams`, `parseF1Params`, `parseIplParams`; each returns `ParseResult<T>`; `showPastEvents` defaults to `true` when absent; invalid `types` values for F1 return `{ ok: false }`; empty `teamIds` string is treated as no filter (all teams)
  - Verify: unit tests pass (written in task G1 — at minimum, manually confirm via `wrangler dev` that `?teamIds=&showPastEvents=invalid` returns 400)
  - Files: `packages/worker/src/params.ts`

- [ ] **E2: ICS response helpers**
  - Acceptance: `packages/worker/src/icsHeaders.ts` exports `icsHeaders()` returning a `Headers` object with `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: public, max-age=3600`, and `Access-Control-Allow-Origin: *`
  - Verify: `tsc --noEmit` passes
  - Files: `packages/worker/src/icsHeaders.ts`

- [ ] **E3: CF Cache API wrapper (`cache.ts`)**
  - Acceptance: `packages/worker/src/cache.ts` exports `withCache(request, ttl, fn)` that checks `caches.default`, returns cached response if hit, calls `fn()` and stores result via `waitUntil` on miss; silently skips cache operations when `caches` is undefined (local dev)
  - Verify: `tsc --noEmit` passes; `wrangler dev` does not throw on cache operations
  - Files: `packages/worker/src/cache.ts`

- [ ] **E4: Hono app entry point and route mounting**
  - Acceptance: `packages/worker/src/index.ts` creates a Hono app with CORS middleware; mounts `/calendar/nba.ics`, `/calendar/nfl.ics`, `/calendar/f1.ics`, `/calendar/ipl.ics` (stub handlers returning 501 for now); returns 404 for all other paths; `OPTIONS` requests return 204 with CORS headers
  - Verify: `wrangler dev` — `curl -X OPTIONS localhost:8787/calendar/nba.ics` returns 204 with `Access-Control-Allow-Origin: *`; `curl localhost:8787/unknown` returns 404
  - Files: `packages/worker/src/index.ts`

---

## Phase F — Worker Routes

- [ ] **F1: NBA route** **(parallel with F2, F3, F4)**
  - Acceptance: `packages/worker/src/routes/nba.ts` implements the full handler — param parse → cache check → fetch → filter → transform → ICS → cache store → respond; replaces the 501 stub in `index.ts`
  - Verify: `curl "localhost:8787/calendar/nba.ics?showPastEvents=true"` returns a response with `Content-Type: text/calendar` containing `BEGIN:VCALENDAR`, at least one `BEGIN:VEVENT`, and `UID:` fields
  - Files: `packages/worker/src/routes/nba.ts`, `packages/worker/src/index.ts`

- [ ] **F2: NFL route** **(parallel with F1, F3, F4)**
  - Acceptance: Same as F1 for NFL endpoint
  - Verify: `curl "localhost:8787/calendar/nfl.ics"` returns valid ICS
  - Files: `packages/worker/src/routes/nfl.ts`, `packages/worker/src/index.ts`

- [ ] **F3: F1 route** **(parallel with F1, F2, F4)**
  - Acceptance: Same pattern; `?types=2,3` returns only Qualifying and Race sessions; `?types=9` returns 400
  - Verify: `curl "localhost:8787/calendar/f1.ics?types=3"` returns ICS with only Race events; `curl "localhost:8787/calendar/f1.ics?types=99"` returns 400
  - Files: `packages/worker/src/routes/f1.ts`, `packages/worker/src/index.ts`

- [ ] **F4: IPL route** **(parallel with F1, F2, F3)**
  - Acceptance: Same pattern using date-range fetch orchestrator
  - Verify: `curl "localhost:8787/calendar/ipl.ics"` returns valid ICS
  - Files: `packages/worker/src/routes/ipl.ts`, `packages/worker/src/index.ts`

---

## Phase G — Tests

- [ ] **G1: Shared package unit tests**
  - Acceptance: Vitest tests in `packages/shared/src/filters/*.test.ts` and `packages/shared/src/params.test.ts` cover: (a) `showPastEvents=false` removes past events; (b) `teamIds` filter excludes non-matching teams; (c) empty `teamIds` returns all events; (d) F1 `types` filter includes only specified session types; (e) valid params parse to `{ ok: true }`; (f) invalid `showPastEvents` value parses to `{ ok: false }`
  - Verify: `npm test -w packages/shared` passes with all cases green
  - Files: `packages/shared/src/filters/*.test.ts`, `packages/shared/src/params.test.ts`

- [ ] **G2: Worker integration tests**
  - Acceptance: Tests in `packages/worker/test/` use `@cloudflare/vitest-pool-workers` with mocked `fetch` (returning fixture ESPN payloads); assert: (a) each route returns `Content-Type: text/calendar`; (b) ICS body contains `BEGIN:VCALENDAR`, `BEGIN:VEVENT`, `UID:`, `DTSTART:`; (c) `?showPastEvents=invalid` returns 400; (d) valid params return 200
  - Verify: `npm test -w packages/worker` passes
  - Files: `packages/worker/test/routes/*.test.ts`, `packages/worker/test/fixtures/*.json`

---

## Phase H — Wrangler Config & Deploy

- [ ] **H1: Finalize `wrangler.toml`**
  - Acceptance: `packages/worker/wrangler.toml` has `name`, `main`, `compatibility_date`, `compatibility_flags = ["nodejs_compat"]`; no secrets or account IDs hardcoded
  - Verify: `wrangler deploy --dry-run` from `packages/worker/` completes without config errors
  - Files: `packages/worker/wrangler.toml`

- [ ] **H2: Deploy to Cloudflare Workers**
  - Acceptance: `wrangler deploy` succeeds; live worker URL (e.g. `https://sports-calendar-worker.{account}.workers.dev`) responds to `/calendar/nba.ics` with valid ICS
  - Verify: Subscribe URL added to Apple Calendar shows NBA events; same URL in Google Calendar shows the same events
  - Files: none (deploy only)

---

## Phase I — CI/CD

- [ ] **I1: Guard existing GH Pages workflows**
  - Acceptance: Root `test:run` script and `lint` script do not inadvertently run worker tests or pick up `packages/worker` tsconfig; `deploy.yml` and `preview.yml` pass on CI after the monorepo conversion
  - Verify: Open a test PR — both `Deploy to GitHub Pages` and `PR Preview` checks go green
  - Files: `package.json`, possibly `.eslintignore` or `eslint.config.*`

- [ ] **I2: Add `deploy-worker.yml` GitHub Actions workflow**
  - Acceptance: `.github/workflows/deploy-worker.yml` exists; triggers on push to `main` with path filter `packages/worker/**` and `packages/shared/**`; runs `npx wrangler deploy` from `packages/worker/` using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets
  - Verify: Merge a change to `packages/worker/` to `main` — the `Deploy Worker` action runs and succeeds; a frontend-only change does not trigger it
  - Files: `.github/workflows/deploy-worker.yml`
