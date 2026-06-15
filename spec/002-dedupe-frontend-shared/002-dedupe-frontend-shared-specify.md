# Spec: De-duplicate frontend logic to use `@sports-calendar/shared`

## Objective

The frontend (`client/`) carries near-verbatim copies of logic that already lives in the
`@sports-calendar/shared` workspace: per-sport event filters, ICS transforms,
`eventStatus` helpers, F1 helpers (event-type translators, session durations, sponsor-name
cleanup), and per-sport duration constants. This duplication lets the two copies drift —
they already have (the client ICS transforms omit fields the shared transforms emit).

Resolves issue #54. Make the frontend consume the shared package directly for filters,
types, transforms, and helpers; delete the duplicated client copies; keep only genuinely
client-specific (React/UI and app-API) code in `client/`.

Detailed design lives in `/root/.claude/plans/system-reminder-message-sent-at-sun-tidy-hopcroft.md`.

## Success Criteria

- No filter, transform, `eventStatus`, F1-helper, or duration logic is defined in `client/`
  that already exists in `shared/` — the frontend imports these from `@sports-calendar/shared`.
- `client/lib/eventStatus.ts` and the duplicated per-sport util files
  (`transform{Sport}EventsToIcs.ts`, `{sport}EventDuration.ts`, F1's `translateF1EventType.ts`,
  `f1SessionDurations.ts`, `cleanUpSponsorName.ts`) are deleted; each `filter{Sport}Events.ts`
  retains only the React `toggle*` helpers.
- `cleanUpF1SponsorNames` is exported from `shared/src/f1/transform.ts` and used by the F1 frontend.
- The frontend's generated `.ics` (IPL download button, and any other client ICS) uses
  shared's transform output (includes `uid` + `description`, constant-derived duration).
- `git grep` finds no imports from the deleted paths (`@/lib/eventStatus`,
  `*/utils/transform*`, `*/utils/*EventDuration`, F1 helper files).
- `npm run test:run`, `npx tsc -b` (or `npm run build`), and `npm run lint` all pass.
- Transform coverage and F1-helper coverage now live in `shared/` (relocated from `client/`),
  with expectations updated to shared's output; client filter tests cover only `toggle*` helpers.

## Out of Scope

- Merging client-specific API helpers (`fetch{Sport}EventRefs`, `fetch{Sport}Teams`,
  `fetchIplEvents`, `build{Sport}FeedUrl`) into shared — these stay in `client/`.
- Changing any shared filter/transform behavior beyond exporting `cleanUpF1SponsorNames`.
- Refactoring the backend (`supabase/functions/`), routing, styling, or any non-duplicated UI.
- New features or visual changes to the sport routes.
