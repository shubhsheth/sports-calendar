# Implementation Notes: Shared Sport Formats & Durations

Implements: `spec/005-shared-sport-formats/005-shared-sport-formats-specify.md`
Tasks: `spec/005-shared-sport-formats/005-shared-sport-formats-tasks.md`

## Current state (verified in-repo, 2026-07-27)

Six constants, two shapes:

| Constant | File | Shape | Value(s) |
|---|---|---|---|
| `NBA_DURATION_MINUTES` | `shared/src/nba/types.ts:4` | number | 150 |
| `NFL_DURATION_MINUTES` | `shared/src/nfl/types.ts:4` | number | 210 |
| `FIFA_DURATION_MINUTES` | `shared/src/fifa/types.ts:4` | number | 120 |
| `IPL_DURATION_MINUTES` | `shared/src/ipl/types.ts:2` | number | 240 |
| `CRICKET_FORMAT_DURATION_MINUTES` | `shared/src/cricketTeam/types.ts:31` | `Record<CricketMatchFormat, number>` | test 7200, odi 480, t20i 240, other 240 |
| `F1_SESSION_DURATIONS` | `shared/src/f1/types.ts:35` | `Record<string, number>` | "1" 60, "2" 60, "3" 120, "5" 45, "6" 30 |

Each of the five non-cricket leagues has exactly three consumers — `filters.ts`,
`transform.ts`, and its event card. Cricket has `filters.ts` and `transform.ts`
plus a card that calls `isCricketEventPast` indirectly.

F1 is the only one with a fallback: `F1_SESSION_DURATIONS[id] ?? 60` appears at
three sites (`f1/filters.ts:20`, `f1/transform.ts:67`,
`client/components/f1/f1-event-card.tsx:57`). Preserve it.

## Why cricket is the odd one out

`shared/src/cricketTeam/filters.ts:38`:

```ts
export function isCricketEventPast(event: CricketTeamEvent): boolean {
  if (event.endDate) {
    return dayjs().isAfter(dayjs(event.endDate));
  }
  return isEventPast(event.date, CRICKET_FORMAT_DURATION_MINUTES[event.format]);
}
```

`endDate` wins whenever present — and measured across 137 matches from four
teams, **100% carry one**, so the duration table below it is near-dead code.

ESPN's `endDate` is not an end time. It is padded to a `23:59` day boundary one
or two days out:

| Format | Median `endDate` span | Nominal duration |
|---|---|---|
| t20i | 39.7h | 4h |
| odi | 44.5h | 8h |
| test | 136h | 120h |

Observed live, a T20I that ESPN itself reported as finished
(`fullStatus.type.state === "post"`) still rendered LIVE:

```
LIVE  start=2026-07-26T11:00Z  end=2026-07-27T23:59Z  fmt=t20i  espnState=post  ZIM v IND
```

And one Test carries an `endDate` 23 days *before* its start
(`IND v AUS`, start `2027-02-27T04:00Z`, `endDate` `2027-02-04T23:59Z`) — under
today's code it silently vanishes from the page and the feed once that date
passes. Ceasing to consult `endDate` removes both failures at once.

The card at `client/components/cricket-teams/cricket-team-event-card.tsx:26`
hand-rolls `dayjs().isAfter(dayjs(event.date)) && !isCricketEventPast(event)`.
Every other league calls `isEventLive(date, DURATION)`. Bringing cricket onto
`isEventLive` (FR-9) removes the divergence.

## Docstrings that are factually wrong today

All three assert `endDate` is a rare, Test-only, accurate field. Fix as part of
T7 rather than leaving them to mislead the next reader:

- `shared/src/cricketTeam/types.ts:30` — "*a fallback for the rare Test missing
  `endDate`*"
- `shared/src/cricketTeam/filters.ts:33` — "*past once its `endDate` has passed
  … without one, fall back to the format's nominal duration*"
- `cricket-team-event-card.tsx:24` — "*the past check is endDate-aware, so a
  Test stays live across all its days*"

## Module shape

`shared/src/sports/formats.ts`. Keep it a plain const map plus a lookup — no
class, no registry, no per-sport config objects. The map *is* the abstraction.

Keyed by **sport, not league**. NBA, NFL, FIFA, F1 and IPL are competitions; a
duration belongs to the game. The clearest evidence is IPL: it is franchise T20
cricket, so its 240 minutes and an international T20's 240 minutes are the same
fact recorded twice under today's league keying. Sport keying states it once.

Sport names come from the taxonomy already in the repo at
`client/api/calendar/fetchPinnedEventDetails.ts:18` — `basketball`, `football`,
`racing`, `soccer` — plus `cricket` from the cricket API paths. Do not invent a
second naming scheme. `football` means American football here; that reads oddly
beside `soccer`, but it is ESPN's convention and already load-bearing in
`CORE_PATHS`.

```ts
export const SPORT_FORMATS = {
  cricket: {
    test: 5 * 24 * 60,
    odi: 480,
    t20i: 240, // international
    t20: 240, // domestic / franchise, e.g. IPL
    other: 240,
  },
  basketball: { standard: 150 },
  football: { standard: 210 },
  soccer: { standard: 120 },
  racing: {
    practice: 60,
    qualifying: 60,
    race: 120,
    sprintQualifying: 45,
    sprint: 30,
  },
} as const;

export type Sport = keyof typeof SPORT_FORMATS;
export type SportFormat<S extends Sport> = keyof (typeof SPORT_FORMATS)[S];
```

`as const` gives NFR-2 its compile-time check: a bad `(sport, format)` pair fails
to type. Derive the format-name type from the map rather than declaring a
parallel union — a parallel union will drift.

**No league → sport map.** Each call site already knows which league it is, so it
names its sport and format directly (`getDurationMinutes("basketball",
"standard")`). Adding a lookup table from league to sport would reintroduce the
league keying this change exists to remove, for no benefit.

**`t20` and `t20i` are both 240 and that is not redundancy to collapse.** They
are different competition classes that happen to share a duration. Merging them
would either misname IPL as international or force renaming `t20i`, which is a
persisted value — see the warning below.

Cricket's existing `CricketMatchFormat` (`"test" | "odi" | "t20i" | "other"`)
matches its format keys exactly, so `event.format` indexes the new map directly
with no translation. `t20` is additive and used only by IPL.

F1 needs an id → name map because ESPN identifies sessions numerically:

```ts
export const F1_SESSION_FORMATS: Record<string, SportFormat<"racing">> = {
  "1": "practice",
  "2": "qualifying",
  "3": "race",
  "5": "sprintQualifying",
  "6": "sprint",
};
```

The three F1 call sites resolve id → name → minutes, falling back to 60 when the
id is unknown. Keep that fallback explicit and commented — it exists because
ESPN occasionally emits session ids the app has never seen.

## Do not rename cricket's format strings

`test`, `odi`, `t20i`, `other` are not internal identifiers. They are:

- validated query-param values — `supabase/functions/_shared/params.ts:70`
- filter-pill ids — `client/components/cricket-teams/utils/filterState.ts:12`
- stored in `calendar_subscriptions.filters` for every saved cricket subscription

Renaming any of them silently breaks existing feed URLs and saved subscriptions —
the feed would 400, or filter to nothing, for users who did not change anything.
This is why IPL gets a new `t20` key rather than the cricket formats being
reshaped around it.

## Sequencing

T1 adds the module without touching anything, so the suite stays green. T2–T7
migrate one league per task; each is independently revertible. T8 only confirms
removal. Do not delete a league's constant before its three consumers are
migrated, or the build breaks mid-task.

Cricket (T7) is deliberately last: it is the only task with a behaviour change,
so everything before it is a pure no-op refactor and any test failure in T2–T6
is unambiguously a migration mistake.

## Testing notes

Parity is the thing to protect (NFR-1). For each non-cricket league assert the
resolved duration equals the old literal — 150, 210, 120, 240, and F1's five —
so a typo during the move fails loudly rather than silently shifting when events
disappear from a list.

For cricket, `shared/src/cricketTeam/testEvent.ts` already exists as a fixture
builder; use it for the new live/past cases rather than hand-rolling events.
Existing cricket tests asserting `endDate` precedence must be rewritten, not
deleted — they should assert the *new* contract.

Remember the calendar function's tests are excluded from vitest and run under
Deno (`vite.config.ts`), and that `supabase/functions` is in `.prettierignore`,
so any file touched there is hand-indented at two spaces.

Run both suites before each commit:

```
npm run test:run
cd supabase/functions && deno test --allow-all --unstable-sloppy-imports calendar/
```

## Verification against live data (T9)

The probe used during investigation fetches a team's events and prints, per
match, whether the card would call it live alongside ESPN's own state. Re-run it
for at least two teams after T7. Success is no row where a match past its
nominal duration reports LIVE, and the `IND v AUS` Test still listed at
`2027-02-27T04:00Z`.

Scripts that import from `shared/` must run from the repo root so `dayjs`
resolves from the workspace's `node_modules`.

## Risks

- **Silent duration drift.** A mistyped number in the map changes when events
  vanish from lists and how long ICS entries run, with nothing to catch it. The
  parity assertions in T2–T6 exist for exactly this.
- **Cricket ICS spans change for Tests.** Accepted and documented in the spec's
  Assumptions: an `endDate`-derived span becomes a five-day one, a difference of
  roughly a day. Subscribers' Test entries shift accordingly.
- **`endDate` becomes unread.** It stays on the event type as parsed upstream
  data; FR-10's issue decides its fate. Do not delete the field in this change.
