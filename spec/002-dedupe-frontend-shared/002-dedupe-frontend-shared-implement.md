# Implement: De-duplicate frontend logic to use `@sports-calendar/shared`

Execution log for the SPECIFY → TASKS → IMPLEMENT workflow. Tasks are defined in
`002-dedupe-frontend-shared-tasks.md`. Work one task at a time; check it off here and in
tasks.md after the human approves the increment.

## Conventions
- Module resolution: `@sports-calendar/shared` → `shared/src/index.ts`
  (`vite.config.ts`, `tsconfig.json`). Import runtime values and types from it directly.
- Match existing import style (named imports, `@/` for client paths).
- Commands: test `npm run test:run` · typecheck `npx tsc -b` · build `npm run build` ·
  lint `npm run lint`.

## Reference (verified during planning)
- Shared already exports per-sport `filter{Sport}Events`/`filter{Sport}Event`,
  `transform{Sport}EventsToIcs`, `isEventLive`/`isEventPast`, F1 `translateF1EventTypeAbbr/Id`,
  `F1_SESSION_DURATIONS` via `shared/src/index.ts`. Only `cleanUpF1SponsorNames` needs exporting.
- `shared/src/{sport}/filters.test.ts` already covers the pure filters for all 5 sports.
  Shared has NO transform tests — T7 adds them.
- Keep in client: `toggle*` helpers, `fetch{Sport}EventRefs`, `fetch{Sport}Teams`,
  `fetchIplEvents`, `build{Sport}FeedUrl`.

## Progress
- [ ] T1 — Export `cleanUpF1SponsorNames`
- [ ] T2 — Slim filters to toggles + repoint filter consumers
- [ ] T3 — Adopt shared transforms
- [ ] T4 — Use shared `eventStatus`
- [ ] T5 — Use shared F1 helpers
- [ ] T6 — Remove orphaned duration constants
- [ ] T7 — Relocate/trim tests
- [ ] T8 — Full verification

## Notes
(Record per-task decisions, surprises, and any spec drift here as work proceeds.)
