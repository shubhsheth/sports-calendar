# Tasks: De-duplicate frontend logic to use `@sports-calendar/shared`

Pattern repeats across five sports: `nba`, `nfl`, `fifa`, `f1`, `ipl`. F1 has extra helpers.
Each task ends in a compiling, testable state. Verify after each with `npx tsc -b` + `npm run test:run`.

- [x] **T1 — Export the missing shared symbol.** In `shared/src/f1/transform.ts`, change
  `cleanUpF1SponsorNames` from a private function to an `export`. No other shared API changes.
  Verify: `npm run test:run` still green.

- [x] **T2 — Slim filters to UI-only + repoint filter consumers.** In each
  `client/components/{sport}/utils/filter{Sport}Events.ts`, remove the duplicated
  `filter{Sport}Events`, `filter{Sport}Event`, `getTeamIdFromRef`, and now-unused
  `isEventPast`/duration imports; keep only the React `toggle*` helpers. Update every consumer
  that imported `filter{Sport}Events`/`filter{Sport}Event` from that path to import from
  `@sports-calendar/shared` (`client/routes/{sport}.tsx`, `*-event-card.tsx`,
  `ipl-download-ical-button.tsx`). `toggle*` imports stay local.
  Verify: typecheck + tests green.

- [x] **T3 — Adopt shared transforms.** Delete each
  `client/components/{sport}/utils/transform{Sport}EventsToIcs.ts` and repoint consumers
  (`client/routes/{sport}.tsx`, `client/components/ipl/ipl-download-ical-button.tsx`) to import
  `transform{Sport}EventsToIcs` from `@sports-calendar/shared`. Also replace the local
  `mapWithConcurrency` defined in `ipl-download-ical-button.tsx` with the shared export.
  Relocate the 5 client `transform{Sport}EventsToIcs.test.ts` → `shared/src/{sport}/transform.test.ts`
  (import the shared transform; update expected ICS to shared's output — `uid`, `description`,
  constant-derived `duration`; avoid the `EventAttributes.duration` access type error). This keeps
  transform coverage intact through the increment.
  Verify: CI gate (lint/format/test/build) green; IPL download still builds.

- [x] **T4 — Use shared `eventStatus`.** Delete `client/lib/eventStatus.ts`; update the five
  `{sport}-event-card.tsx` files (and any other importers of `@/lib/eventStatus`) to import
  `isEventLive`/`isEventPast` from `@sports-calendar/shared`.
  Verify: typecheck passes.

- [ ] **T5 — Use shared F1 helpers (absorbs T7).** Delete
  `client/components/f1/utils/translateF1EventType.ts`, `f1SessionDurations.ts`,
  `cleanUpSponsorName.ts`. Repoint `f1-event-card.tsx`, `f1-filter-selector.tsx`,
  `f1-filter-pills.tsx`: `translateF1EventTypeAbbr/Id` and `F1_SESSION_DURATIONS` from
  `@sports-calendar/shared`; replace `cleanUpSponsorName(...)` call with
  `cleanUpF1SponsorNames(...)` from `@sports-calendar/shared`. Relocate the two helper tests
  (atomic, to keep tests green): `translateF1EventType.test.ts` → `shared/src/f1/types.test.ts`
  (import translators from `./types.ts`); fold `cleanUpSponsorName.test.ts` into
  `shared/src/f1/transform.test.ts` (import `cleanUpF1SponsorNames` from `./transform.ts`).
  Verify: CI gate green.

- [ ] **T6 — Consolidate duration constants in shared.** For `nba`, `nfl`, `fifa`, `ipl`:
  add `export const {SPORT}_DURATION_MINUTES = <n>;` to `shared/src/{sport}/types.ts` and
  import it in that sport's `filters.ts` and `transform.ts` (removing their private duplicate
  consts — same values, so shared tests stay green). Delete each client
  `{sport}EventDuration.ts` and repoint the `{sport}-event-card.tsx` live-badge logic to import
  `{SPORT}_DURATION_MINUTES` from `@sports-calendar/shared`.
  Verify: `git grep` finds no remaining client duration imports; typecheck + tests pass.

- [x] **T7 — Relocate F1 helper tests.** Absorbed into T5 (must be atomic with deleting the
  helper sources to keep tests green). Transform-test relocation handled in T3; client filter
  tests trimmed in T2.

- [ ] **T8 — Full verification.** Run `npm run test:run`, `npm run build` (or `npx tsc -b`),
  `npm run lint`. `git grep` confirms no imports from deleted paths. `npm run dev` smoke-test
  each route (`/nba /nfl /fifa /f1 /ipl`): filtering (past toggle, team/type pills), live
  badges, and IPL `.ics` download (events now carry `uid`/`description`).
