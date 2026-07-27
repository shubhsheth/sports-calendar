# Spec: Shared Sport Formats & Durations

## Objective

Every league currently declares its own event duration in its own `types.ts`, in
two incompatible shapes: four leagues export a bare number
(`NBA_DURATION_MINUTES = 150`), two export a keyed map
(`CRICKET_FORMAT_DURATION_MINUTES`, `F1_SESSION_DURATIONS`). There is no single
place to answer "how long is an event of this kind?", so each consumer reaches
for a different constant and cricket has drifted into computing live/past a
third way entirely — via ESPN's `endDate`, which is padded to a day boundary and
leaves finished T20Is showing a LIVE badge for ~40 hours.

Replace all six with one shared, uniformly-shaped source of truth: every sport
declares **named formats**, each format carries its **nominal duration in
minutes**, and a single helper resolves `(sport, format) → minutes`. Every card,
filter, and ICS transform in the app reads from it.

The user-visible payoff is that a finished cricket match stops claiming to be
live. The structural payoff is that adding a sport, or a format whose duration
differs, becomes a one-line change in one file instead of a new constant plus
new call sites.

## User Stories

- As someone browsing a cricket team's schedule, I want a finished match to stop
  showing a LIVE badge, so I can tell at a glance what is actually on now.
- As someone browsing any schedule with "hide past events" on, I want finished
  events to leave the list promptly rather than lingering for a day or more.
- As someone subscribed to a cricket ICS feed, I want every match to appear with
  a sane start and end, including matches whose upstream data is malformed.
- As an engineer adding a sport or a format, I want one place to declare its
  duration, so I don't have to find and update scattered constants.

## Functional Requirements

- **FR-1:** A single shared module exports a map from sport → format name →
  nominal duration in minutes, covering all six sports currently in the app:
  NBA, NFL, FIFA, F1, IPL, and cricket.
- **FR-2:** Every sport declares **named formats**, including sports whose
  duration does not vary today. Single-duration sports get one named format
  rather than a bare number, so all six share one shape.
- **FR-3:** A helper resolves a `(sport, format)` pair to its duration in
  minutes, with a documented fallback when the format is unknown. The fallback
  must preserve F1's current behaviour, where an unrecognised session type id
  resolves to 60 minutes.
- **FR-4:** F1's ESPN session type ids (`"1"`, `"2"`, `"3"`, `"5"`, `"6"`) map to
  named formats. Existing durations are preserved exactly: practice 60,
  qualifying 60, race 120, sprint qualifying 45, sprint 30.
- **FR-5:** The six per-league duration constants are removed. Every consumer —
  the six event cards, the six `filters.ts`, and the six `transform.ts` — reads
  durations through the shared module. No league retains a private duration
  constant.
- **FR-6:** `isEventLive` and `isEventPast` remain in `shared/src/eventStatus.ts`
  with their current signatures. They are fed durations from the shared module
  rather than being absorbed into it.
- **FR-7:** Cricket live/past is computed from the format duration alone. ESPN's
  `endDate` is no longer consulted when deciding whether a match is live or past.
- **FR-8:** Cricket ICS entries derive their span from the format duration, on
  the same basis as FR-7, so a match's end is computed one way everywhere.
- **FR-9:** Cricket's live/past logic follows the same shape as the other five
  leagues, calling the shared `isEventLive` / `isEventPast` rather than a
  bespoke `isCricketEventPast` with its own precedence rules.
- **FR-10:** A GitHub issue is filed describing how Test-match duration should be
  improved beyond a flat five-day window, and what would make upstream end-time
  data trustworthy enough to use.

## Non-Functional Requirements

- **NFR-1:** No change to any non-cricket league's observable behaviour. NBA,
  NFL, FIFA, F1, and IPL events must resolve to exactly the durations they
  resolve to today.
- **NFR-2:** Format names are part of the module's public surface and must be
  type-checked, so an invalid `(sport, format)` pair fails at compile time rather
  than silently resolving to a fallback.
- **NFR-3:** The change is a pure consolidation plus the cricket correction. No
  new runtime dependencies, no new network calls, no schema changes.

## Out of Scope

- **Per-event format detection for NBA, NFL, and FIFA.** Their named formats stay
  single-valued. Adding real variance (FIFA knockout with extra time, playoff
  variants) needs new per-event parsing from ESPN data and is its own change.
- **Improving Test-match accuracy.** A Test resolves to its flat five-day nominal
  window. Doing better needs trustworthy end data; captured in FR-10's issue
  rather than solved here.
- **Trusting ESPN's `state` field (`pre`/`in`/`post`).** Deliberately not used —
  live/past stays purely time-derived and deterministic.
- **Changing the 30-minute React Query `staleTime`** or any refetch behaviour.
- **The pre-existing Node 20 deprecation warning** across the four workflows.

## Assumptions

- Cricket's `endDate` field stays on the event type. It remains parsed upstream
  data rather than something this change orphans, and FR-10's issue will decide
  whether it can be made trustworthy. It simply stops driving duration.
- Dropping `endDate` from cricket ICS spans changes existing calendar entries for
  Tests, from an `endDate`-derived span to a five-day one. Measured against live
  data these differ by roughly a day (e.g. a Test starting 15 Aug 04:30 currently
  ends 20 Aug 23:59; it will end 20 Aug 04:30). Accepted as the cost of computing
  an end one way everywhere, and it removes the case below.
- One live Test currently carries an `endDate` 23 days *before* its start
  (`IND v AUS`, starts 2027-02-27, `endDate` 2027-02-04). Under today's code that
  match disappears from the page and the feed three weeks before it is played.
  Ceasing to consult `endDate` removes this class of failure rather than
  special-casing it.
- Sport identifiers reuse the league keys already used across the app (`nba`,
  `nfl`, `f1`, `ipl`, `fifa`, plus cricket's existing `cricket-team` domain), so
  no new naming scheme is introduced.

## Tech Stack

TypeScript 5.9 · React 19 · Vite 7 · Vitest 4 · dayjs 1.11 · `ics` 3.8 ·
Deno (Supabase Edge Function). No additions.

## Commands

```
Dev:          npm run dev
Build:        npm run build
Test:         npm run test:run
Test (watch): npm test
Coverage:     npm run test:coverage
Lint:         npm run lint
Format check: npm run format:check
Fix:          npm run fix
Deno tests:   cd supabase/functions && deno test --allow-all --unstable-sloppy-imports calendar/
```

## Project Structure

```
shared/src/sports/        → NEW. Shared sport/format/duration source of truth
                            (*.test.ts colocated)
shared/src/eventStatus.ts → isEventLive / isEventPast (unchanged signatures)
shared/src/{nba,nfl,f1,ipl,fifa}/
                          → types.ts (duration const removed), filters.ts,
                            transform.ts
shared/src/cricketTeam/   → types.ts, filters.ts, transform.ts
client/components/{nba,nfl,f1,ipl,fifa,cricket-teams}/
                          → event cards
supabase/functions/calendar/
                          → ICS routes; Deno tests (excluded from vitest)
```

## Code Style

Named formats keyed per sport, durations in minutes, resolved through one helper:

```ts
/**
 * Nominal duration in minutes per sport and format. Every sport declares named
 * formats — including those with a single format today — so one shape covers
 * all of them and a new format is a one-line addition.
 */
export const SPORT_FORMATS = {
  nba: { regular: 150 },
  nfl: { regular: 210 },
  fifa: { group: 120 },
  ipl: { league: 240 },
  cricket: { test: 5 * 24 * 60, odi: 480, t20i: 240, other: 240 },
  f1: {
    practice: 60,
    qualifying: 60,
    race: 120,
    sprintQualifying: 45,
    sprint: 30,
  },
} as const;
```

Conventions: two-space indent, `SCREAMING_SNAKE_CASE` for constants,
`camelCase` format names, JSDoc on every exported symbol explaining *why* a value
is what it is (not restating it). Prettier governs everything except
`supabase/functions`, which is in `.prettierignore` and hand-indented.

## Testing Strategy

Vitest, tests colocated as `*.test.ts` beside the code. The calendar function's
tests run under Deno (vitest excludes `supabase/functions/calendar/**`); both
suites run per-PR via the `PR Tests` workflow.

- **Unit — shared module:** every sport resolves each of its formats to the
  expected minutes; an unknown format hits the documented fallback; F1 session
  ids map to the right formats.
- **Regression — parity:** each of the five non-cricket leagues resolves to the
  exact duration its old constant held, guarding NFR-1.
- **Behaviour — cricket:** a finished T20I is past and not live; a match still
  inside its window is live; a match whose `endDate` precedes its start is
  unaffected by that `endDate`; ICS spans derive from duration.
- **Existing suites:** all current tests continue to pass unchanged except where
  they assert the removed constants or cricket's old `endDate` precedence.

## Boundaries

- **Always:** run `npm run test:run` *and* the Deno suite before committing;
  keep non-cricket durations numerically identical; colocate tests; match the
  surrounding file's style.
- **Ask first:** changing any non-cricket league's observable behaviour; adding
  a format that requires new ESPN parsing; altering `isEventLive`/`isEventPast`
  signatures; changing the ICS `uid` scheme.
- **Never:** commit secrets; delete a failing test to make a suite pass; leave a
  league with a private duration constant after migration; introduce a format
  name not backed by a real duration.

## Success Criteria

1. A cricket match past its nominal duration shows no LIVE badge, and one inside
   its window does.
2. With "hide past events" on, a finished cricket match leaves the list once its
   nominal duration has elapsed, rather than lingering until the next day.
3. A cricket match whose upstream end data precedes its start still appears on
   the schedule and in the feed at its correct start time.
4. NBA, NFL, FIFA, F1, and IPL events resolve to exactly the durations they did
   before, verified by test.
5. Searching the codebase for the six removed constants returns no definitions
   and no consumers.
6. Adding a new sport, or a new format for an existing sport, requires editing
   one file.
7. Both test suites pass, lint reports no new problems, and formatting is clean.
8. An issue exists describing how Test-match duration should be improved.

## Open Questions

None. Direction was settled before writing: uniform named formats for every
sport; the cricket fix folded into this change; live/past always duration-derived
rather than trusting ESPN's status; and `eventStatus.ts` retained and fed from
the shared constants rather than absorbed.
