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
- [x] T1 — Export `cleanUpF1SponsorNames`
- [x] T2 — Slim filters to toggles + repoint filter consumers
- [x] T3 — Adopt shared transforms
- [x] T4 — Use shared `eventStatus`
- [ ] T5 — Use shared F1 helpers
- [ ] T6 — Remove orphaned duration constants
- [ ] T7 — Relocate/trim tests
- [ ] T8 — Full verification

## Notes
- **Out of scope (flagged, not touched):** `client/components/nba/utils/translateNbaEventType.ts`
  (+ its test) is pre-existing dead code — only its own test imports it, no component uses it, and
  shared has no NBA translator counterpart. Not a shared-package duplicate, so left alone per the
  surgical-change rule. Worth a separate cleanup.
- **Spec drift (pre-T2):** Duration constants are NOT orphaned — `{sport}-event-card.tsx`
  (nba/nfl/fifa/ipl) use `{SPORT}_DURATION_MINUTES` for the live badge. Shared keeps them as
  private, duplicated consts in filters.ts + transform.ts. T6 reworked: export the constant
  once from `shared/src/{sport}/types.ts`, refactor shared filters/transform to import it,
  delete client copies, repoint event cards. F1 already uses shared `F1_SESSION_DURATIONS`.
- **CI gate (verified):** CI runs `npm run lint && npm run format:check`, `npm run test:run`,
  `npm run build` (Vite/esbuild). It does NOT run `tsc -b`. Baseline `tsc -b` already has 6
  pre-existing `duration`-on-`EventAttributes` errors in the client `transform*.test.ts` files
  (relocated/fixed in T7). Use the CI gate as the per-task verification, not `tsc -b`.
- **T7 caution:** when relocating transform tests to shared, avoid re-introducing the
  `EventAttributes.duration` access error (the `ics` union doesn't expose `duration` directly).
