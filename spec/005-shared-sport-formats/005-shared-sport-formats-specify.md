# Spec: Shared Sport Formats & Durations

## Objective

Every league currently declares its own event duration in its own `types.ts`, in
two incompatible shapes: four export a bare number (`NBA_DURATION_MINUTES = 150`),
two export a keyed map (`CRICKET_FORMAT_DURATION_MINUTES`, `F1_SESSION_DURATIONS`).
There is no single place to answer "how long is an event of this kind?", so each
consumer reaches for a different constant and cricket has drifted into computing
live/past a third way entirely — via ESPN's `endDate`, which is padded to a day
boundary and leaves finished T20Is showing a LIVE badge for ~40 hours.

Replace all six with one shared source of truth keyed by **sport**, not league.
NBA, NFL, FIFA, F1 and IPL are leagues; a duration is a property of the sport and
its format, not of the competition. Modelling it by sport collapses real
duplication — IPL and the cricket team pages are both **cricket**, and IPL's 240
minutes is the same number as a T20's 240 minutes for the same reason. Keying by
league hides that; keying by sport states it once.

Each sport declares **named formats**, each format carries its **nominal duration
in minutes**, and a single helper resolves `(sport, format) → minutes`. Every
card, filter, and ICS transform reads from it.

The user-visible payoff is that a finished cricket match stops claiming to be
live. The structural payoff is that a new league of an existing sport costs
nothing — it names a sport and a format that already exist.

## User Stories

- As someone browsing a cricket team's schedule, I want a finished match to stop
  showing a LIVE badge, so I can tell at a glance what is actually on now.
- As someone browsing any schedule with "hide past events" on, I want finished
  events to leave the list promptly rather than lingering for a day or more.
- As someone subscribed to a cricket ICS feed, I want every match to appear with
  a sane start and end, including matches whose upstream data is malformed.
- As an engineer adding a league, I want to name an existing sport and format
  rather than declare a new duration constant.

## Functional Requirements

- **FR-1:** A single shared module exports a map from **sport** → format name →
  nominal duration in minutes, covering the five sports the app carries:
  cricket, basketball, football, racing, and soccer.
- **FR-2:** Sport identifiers match the taxonomy already used in the codebase at
  `client/api/calendar/fetchPinnedEventDetails.ts:18` (`basketball`, `football`,
  `racing`, `soccer`), extended with `cricket`. No new naming scheme is invented.
  Per ESPN's convention, already embedded in those paths, `football` means
  American football and `soccer` is the association game.
- **FR-3:** Every sport declares **named formats**, including sports whose
  duration does not vary today, so all five share one shape.
- **FR-4:** The six leagues resolve to a `(sport, format)` pair at their call
  sites. No league-keyed duration map is introduced — a league is not a unit of
  duration:
  | League | Sport | Format |
  |---|---|---|
  | NBA | basketball | standard |
  | NFL | football | standard |
  | FIFA | soccer | standard |
  | IPL | cricket | t20 |
  | Cricket teams | cricket | per event (`test`/`odi`/`t20i`/`other`) |
  | F1 | racing | per session (`practice`/`qualifying`/`race`/`sprint`/`sprintQualifying`) |
- **FR-5:** Cricket declares both `t20i` (international) and `t20` (domestic and
  franchise, which is what IPL is), each 240 minutes. `t20i` keeps its exact
  current spelling because it is a persisted value — see NFR-4.
- **FR-6:** A helper resolves a `(sport, format)` pair to its duration in
  minutes, with a documented fallback when the format is unknown. The fallback
  must preserve F1's current behaviour, where an unrecognised session type id
  resolves to 60 minutes.
- **FR-7:** F1's ESPN session type ids (`"1"`, `"2"`, `"3"`, `"5"`, `"6"`) map to
  named racing formats. Existing durations are preserved exactly: practice 60,
  qualifying 60, race 120, sprint qualifying 45, sprint 30.
- **FR-8:** The six per-league duration constants are removed. Every consumer —
  the six event cards, the six `filters.ts`, and the six `transform.ts` — reads
  durations through the shared module. No league retains a private duration
  constant.
- **FR-9:** `isEventLive` and `isEventPast` remain in `shared/src/eventStatus.ts`
  with their current signatures, fed durations from the shared module rather than
  absorbed into it.
- **FR-10:** Cricket live/past is computed from the format duration alone. ESPN's
  `endDate` is no longer consulted when deciding whether a match is live or past.
- **FR-11:** Cricket ICS entries derive their span from the format duration, on
  the same basis as FR-10, so an end is computed one way everywhere.
- **FR-12:** Cricket's live/past logic follows the same shape as the other
  leagues, calling the shared `isEventLive` / `isEventPast` rather than a bespoke
  `isCricketEventPast` with its own precedence rules.
- **FR-13:** A GitHub issue is filed describing how Test-match duration should be
  improved beyond a flat five-day window, and what would make upstream end-time
  data trustworthy enough to use.

## Non-Functional Requirements

- **NFR-1:** No change to any non-cricket league's observable behaviour. NBA,
  NFL, FIFA, F1, and IPL events must resolve to exactly the durations they
  resolve to today.
- **NFR-2:** Format names are part of the module's public surface and must be
  type-checked, so an invalid `(sport, format)` pair fails at compile time rather
  than silently resolving to a fallback.
- **NFR-3:** A pure consolidation plus the cricket correction. No new runtime
  dependencies, no new network calls, no schema changes.
- **NFR-4:** The cricket format strings `test`, `odi`, `t20i`, `other` are
  persisted and externally visible — they are validated query-param values
  (`supabase/functions/_shared/params.ts:70`), filter-pill ids
  (`client/components/cricket-teams/utils/filterState.ts:12`), and stored in
  `calendar_subscriptions.filters`. They must not be renamed, or existing feed
  URLs and saved subscriptions break.

## Out of Scope

- **Per-event format detection for basketball, football, and soccer.** Their
  named formats stay single-valued. Adding real variance (soccer knockout with
  extra time, playoff variants) needs new per-event parsing from ESPN data and is
  its own change.
- **Improving Test-match accuracy.** A Test resolves to its flat five-day nominal
  window; captured in FR-13's issue rather than solved here.
- **Trusting ESPN's `state` field (`pre`/`in`/`post`).** Deliberately not used —
  live/past stays purely time-derived and deterministic.
- **Renaming any persisted cricket format value** (see NFR-4).
- **Changing the 30-minute React Query `staleTime`** or any refetch behaviour.

## Assumptions

- `t20` and `t20i` both being 240 minutes is not redundancy to collapse. They are
  distinct competition classes that happen to share a duration, and merging them
  would either misname IPL as international or force a rename of a persisted
  value (NFR-4).
- Cricket's `endDate` field stays on the event type. It remains parsed upstream
  data rather than something this change orphans, and FR-13's issue will decide
  whether it can be made trustworthy. It simply stops driving duration.
- Dropping `endDate` from cricket ICS spans changes existing calendar entries for
  Tests, from an `endDate`-derived span to a five-day one. Measured against live
  data these differ by roughly a day (a Test starting 15 Aug 04:30 currently ends
  20 Aug 23:59; it will end 20 Aug 04:30). Accepted as the cost of computing an
  end one way everywhere.
- One live Test carries an `endDate` 23 days *before* its start (`IND v AUS`,
  starts 2027-02-27, `endDate` 2027-02-04). Under today's code that match
  disappears from the page and the feed three weeks before it is played. Ceasing
  to consult `endDate` removes this class of failure rather than special-casing it.
- `football` meaning American football reads oddly next to `soccer`, but it is
  ESPN's convention and already encoded in the repo's `CORE_PATHS`. Consistency
  with the existing taxonomy beats introducing a second one.

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

Keyed by sport, then format, durations in minutes:

```ts
/**
 * Nominal duration in minutes per sport and format. Keyed by sport rather than
 * league because duration is a property of the game, not the competition — IPL
 * and international T20s are both 240 minutes for the same reason, and a new
 * league of an existing sport needs no entry here at all.
 */
export const SPORT_FORMATS = {
  cricket: {
    test: 5 * 24 * 60,
    odi: 480,
    t20i: 240, // international
    t20: 240, // domestic / franchise, e.g. IPL
    other: 240,
  },
  basketball: { standard: 150 },
  football: { standard: 210 }, // American football, per ESPN's taxonomy
  soccer: { standard: 120 },
  racing: {
    practice: 60,
    qualifying: 60,
    race: 120,
    sprintQualifying: 45,
    sprint: 30,
  },
} as const;
```

Conventions: two-space indent, `SCREAMING_SNAKE_CASE` for constants, `camelCase`
format names, JSDoc on every exported symbol explaining *why* a value is what it
is. Prettier governs everything except `supabase/functions`, which is in
`.prettierignore` and hand-indented.

## Testing Strategy

Vitest, tests colocated as `*.test.ts` beside the code. The calendar function's
tests run under Deno (vitest excludes `supabase/functions/calendar/**`); both
suites run per-PR via the `PR Tests` workflow.

- **Unit — shared module:** every sport resolves each of its formats to the
  expected minutes; an unknown format hits the documented fallback; F1 session
  ids map to the right racing formats.
- **Regression — parity:** each of the five non-cricket leagues resolves to the
  exact duration its old constant held, guarding NFR-1. IPL specifically must
  resolve via `cricket`/`t20` to 240.
- **Behaviour — cricket:** a finished T20I is past and not live; a match still
  inside its window is live; a match whose `endDate` precedes its start is
  unaffected by that `endDate`; ICS spans derive from duration.
- **Guard — persisted values:** the cricket format strings accepted by the feed
  params and filter pills are unchanged (NFR-4).

## Boundaries

- **Always:** run `npm run test:run` *and* the Deno suite before committing; keep
  non-cricket durations numerically identical; colocate tests; match the
  surrounding file's style.
- **Ask first:** changing any non-cricket league's observable behaviour; adding a
  format that requires new ESPN parsing; altering `isEventLive`/`isEventPast`
  signatures; changing the ICS `uid` scheme.
- **Never:** rename a persisted cricket format value; commit secrets; delete a
  failing test to make a suite pass; leave a league with a private duration
  constant after migration; key durations by league.

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
6. The shared module contains no league names — only sports and formats.
7. Adding a league of an existing sport requires no change to the shared module.
8. Existing cricket feed URLs and saved subscriptions keep working unchanged.
9. Both test suites pass, lint reports no new problems, formatting is clean.
10. An issue exists describing how Test-match duration should be improved.

## Open Questions

None. Settled before writing: keyed by sport rather than league; uniform named
formats for every sport; the cricket fix folded in; live/past always
duration-derived rather than trusting ESPN's status; and `eventStatus.ts`
retained and fed from the shared constants rather than absorbed.
