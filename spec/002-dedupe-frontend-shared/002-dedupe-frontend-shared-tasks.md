# Tasks: De-duplicate frontend logic to use `@sports-calendar/shared`

Pattern repeats across five sports: `nba`, `nfl`, `fifa`, `f1`, `ipl`. F1 has extra helpers.
Each task ends in a compiling, testable state. Verify after each with `npx tsc -b` + `npm run test:run`.

- [ ] **T1 — Export the missing shared symbol.** In `shared/src/f1/transform.ts`, change
  `cleanUpF1SponsorNames` from a private function to an `export`. No other shared API changes.
  Verify: `npm run test:run` still green.

- [ ] **T2 — Slim filters to UI-only + repoint filter consumers.** In each
  `client/components/{sport}/utils/filter{Sport}Events.ts`, remove the duplicated
  `filter{Sport}Events`, `filter{Sport}Event`, `getTeamIdFromRef`, and now-unused
  `isEventPast`/duration imports; keep only the React `toggle*` helpers. Update every consumer
  that imported `filter{Sport}Events`/`filter{Sport}Event` from that path to import from
  `@sports-calendar/shared` (`client/routes/{sport}.tsx`, `*-event-card.tsx`,
  `ipl-download-ical-button.tsx`). `toggle*` imports stay local.
  Verify: typecheck + tests green.

- [ ] **T3 — Adopt shared transforms.** Delete each
  `client/components/{sport}/utils/transform{Sport}EventsToIcs.ts` and repoint consumers
  (`client/routes/{sport}.tsx`, `client/components/ipl/ipl-download-ical-button.tsx`) to import
  `transform{Sport}EventsToIcs` from `@sports-calendar/shared`.
  Verify: typecheck passes; IPL download still builds.

- [ ] **T4 — Use shared `eventStatus`.** Delete `client/lib/eventStatus.ts`; update the five
  `{sport}-event-card.tsx` files (and any other importers of `@/lib/eventStatus`) to import
  `isEventLive`/`isEventPast` from `@sports-calendar/shared`.
  Verify: typecheck passes.

- [ ] **T5 — Use shared F1 helpers.** Delete `client/components/f1/utils/translateF1EventType.ts`,
  `f1SessionDurations.ts`, `cleanUpSponsorName.ts`. Repoint `f1-event-card.tsx`,
  `f1-filter-selector.tsx`, `f1-filter-pills.tsx`: `translateF1EventTypeAbbr/Id` and
  `F1_SESSION_DURATIONS` from `@sports-calendar/shared`; replace `cleanUpSponsorName(...)`
  call with `cleanUpF1SponsorNames(...)` from `@sports-calendar/shared`.
  Verify: typecheck passes.

- [ ] **T6 — Remove orphaned duration constants.** Delete each
  `client/components/{sport}/utils/{sport}EventDuration.ts` (now unused after T2/T3).
  Verify: `git grep` finds no remaining importers; typecheck passes.

- [ ] **T7 — Relocate and trim tests.**
  - Move `transform{Sport}EventsToIcs.test.ts` → `shared/src/{sport}/transform.test.ts`,
    importing the shared transform and updating expected ICS to shared's output
    (`uid`, `description`, constant-derived `duration`).
  - Move `translateF1EventType.test.ts` and `cleanUpSponsorName.test.ts` → `shared/src/f1/`,
    importing the shared exports.
  - Trim each client `filter{Sport}Events.test.ts` to cover only the `toggle*` helpers
    (pure-filter coverage already exists in `shared/src/{sport}/filters.test.ts`).
  Verify: `npm run test:run` green; no test references deleted client modules.

- [ ] **T8 — Full verification.** Run `npm run test:run`, `npm run build` (or `npx tsc -b`),
  `npm run lint`. `git grep` confirms no imports from deleted paths. `npm run dev` smoke-test
  each route (`/nba /nfl /fifa /f1 /ipl`): filtering (past toggle, team/type pills), live
  badges, and IPL `.ics` download (events now carry `uid`/`description`).
