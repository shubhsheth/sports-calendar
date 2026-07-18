# Spec: Cricket Team Calendars (the Teams dimension)

## Objective

Add the first *team-centric* dimension to the app: follow a cricket national team (e.g.
Team India) across **every** series it plays — tours, tournaments, home and away — rather
than one league at a time. Today the app is league-centric (NBA, NFL, F1, IPL, FIFA);
cricket is the sport where that model breaks down, because ESPN represents each cricket
tour/tournament as its own transient "league" (a *series ID*), so a national side's
fixtures are scattered across many short-lived series (verified 2026-07-17: India appears
in series 24301, 24567, 24289, and 24469 within three months).

The teams dimension surfaces on the **home page**: alongside the existing navigation
grid, home gains a **Teams** filter (the 12 curated ICC full members) and a **Leagues**
filter (the five existing leagues). Selecting entries in either or both populates one
merged, chronological schedule of everything selected — India's matches interleaved
with NBA games — with full parity affordances: format filters for cricket, one-time
`.ics` download of the selection, per-source live feed links, and Save/Pin to My
Calendar. Existing per-league pages are unchanged; the home surface is purely additive.

First iteration puts only cricket national teams in the Teams filter (the 12 ICC full
members, curated). Team dimensions for other sports reuse this groundwork later.

## ESPN API research (verified with live fetches, 2026-07-17)

There is **no team-schedule endpoint for cricket** — `…/cricket/{league}/teams`,
`…/cricket/{league}/teams/{id}/schedule`, `…/cricket/teams/{id}`, and the Core API
(`sports.core.api.espn.com/v2/sports/cricket/leagues` → empty) all fail; ESPNcricinfo's
`hs-consumer-api` is bot-blocked. The workable pipeline is:

1. **Series discovery** — `site.web.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&dates=YYYYMMDD`
   returns every series with a match on that date, with events and competitor team IDs
   inline. Sampling dates across a window and filtering by team ID finds all the team's
   series. Date *ranges* are not supported (verified: `dates=A-B` returns empty).
2. **Series calendar** — `site.api.espn.com/apis/site/v2/sports/cricket/{seriesId}/scoreboard`
   (any date, or none) always includes `leagues[0].calendar`: the exact list of match
   dates in that series. No blind day-walking needed.
3. **Events per date** — `…/cricket/{seriesId}/scoreboard?dates=YYYYMMDD` returns fully
   inline events in **the same shape the IPL module already parses** (competitors, logos,
   venue, status). Additionally `competitions[0].class` carries the match format
   (`generalClassCard: "T20I"`, `internationalClassId`: 1=Test, 2=ODI, 3=T20I) and
   `competitions[0].description` reads e.g. "2nd T20I"; events carry `endDate`
   (multi-day Tests).

Curated men's national team IDs, each verified against live scoreboard data:

| Team | ID | | Team | ID |
|------|----|-|------|----|
| England | 1 | | India | 6 |
| Australia | 2 | | Pakistan | 7 |
| South Africa | 3 | | Sri Lanka | 8 |
| West Indies | 4 | | Zimbabwe | 9 |
| New Zealand | 5 | | Bangladesh | 25 |
| Ireland | 29 | | Afghanistan | 40 |

Team logos follow the existing CDN pattern
`https://a.espncdn.com/i/teamlogos/cricket/500/{id}.png` (same as IPL).

## User Stories

- As a Team India fan, I want to select India on the home page and see every upcoming
  India match across all tours and tournaments so that I don't have to know which
  series exist.
- As a multi-sport fan, I want to select a team and a league together (e.g. India +
  NBA) and see one merged chronological schedule so that I can browse everything I
  follow in one place.
- As a fan, I want to subscribe to a live feed of my team's matches so that new series
  appear in my calendar automatically as ESPN publishes them.
- As a Test purist, I want to filter to only the formats I care about (e.g. Tests) so
  that T20Is don't clutter my calendar.
- As a signed-in user, I want to save my selection (and pin individual marquee matches)
  to My Calendar so that it combines into one feed.

## Functional Requirements

- FR-1: The home page offers a **Teams** filter (the 12 curated national teams, with
  logos) and a **Leagues** filter (NBA, NFL, F1, IPL, FIFA), both multi-select and
  persisted across visits; with nothing selected, home shows the existing navigation
  grid unchanged.
- FR-2: Selecting teams and/or leagues populates one merged chronological schedule:
  each selected cricket team contributes its matches across every series in the
  discovery window (card shows opponent, series name, match format, venue, local time,
  live/past status — IPL-style); each selected league contributes its season's events
  rendered with that league's existing card style.
- FR-3: Cricket matches can be filtered by format (Test / ODI / T20I / Other) with the
  same pill-based filter UX as league pages; format filters apply to the merged list,
  the download, and are encoded in cricket-team feed URLs.
- FR-4: Home offers a one-time `.ics` download of the current (filtered) selection —
  all selected teams and leagues combined — plus per-selected-source live feed links
  (existing league feeds; new cricket-team feeds).
- FR-5: The backend serves a live feed `GET /calendar/cricket-team/{teamId}.ics`
  (optional `?formats=` param) that re-runs discovery on request so newly announced
  series appear without user action. Unknown team IDs return 400/404.
- FR-6: A signed-in user can save one or more cricket teams to My Calendar (with the
  selected format filters) and pin/unpin individual matches from the merged schedule's
  cards; both appear on the My Calendar page with remove actions, and the personal
  combined feed includes them (deduplicated, like existing leagues).
- FR-7: Multi-day matches (Tests) appear as multi-day calendar events using ESPN's
  `endDate`; single-day formats use format-appropriate durations.
- FR-8: All existing league pages, downloads, feeds, and My Calendar behavior remain
  unchanged.

## Non-Functional Requirements

- NFR-1: Discovery window is bounded (see Assumptions) and the full team fetch
  (discovery + series calendars + match dates) stays within the same order of magnitude
  of ESPN calls as an existing full-season league fetch (~60 discovery calls + ~1 call
  per series + ~1 call per match day), fanned out via `mapWithConcurrency`.
- NFR-2: Client caches with the existing React Query policy (30 m stale / 60 m gc); the
  feed endpoint sends the same 1-hour cache headers as existing league feeds.
- NFR-2a: Home fetches only what is selected (nothing selected = zero schedule
  fetches, page as cheap as today); each selected source is one cached React Query
  entry, so toggling a source off and on refetches nothing within the stale window.
- NFR-3: The discovery scan degrades gracefully: a failed sample date is skipped (logged),
  not fatal to the whole schedule.

## Out of Scope

- Team dimensions for NBA/NFL/FIFA/IPL/soccer clubs (endpoints verified viable —
  Core API `…/seasons/{yr}/teams/{id}/events`, global soccer team IDs — but deferred).
- Women's national teams, U19 sides, A-teams, and franchise T20 teams (distinct ESPN
  team IDs; the curated list is men's full members only).
- Dynamic team discovery/search beyond the curated 12.
- Scores, results detail, standings, or match pages — schedule/calendar only.
- Any change to F1 (no competitors on events; teams dimension does not apply).

## Assumptions

- Discovery window: 1 month back to 6 months ahead, sampled every 3 days (~61 header
  calls). A series is captured if *any* of its match days lands on a sample date; a
  hypothetical series spanning fewer than 3 total days could be missed — accepted risk,
  vanishingly rare for full-member sides.
- Format classification uses `competitions[0].class`
  (`internationalClassId` 1/2/3 → Test/ODI/T20I; anything else → Other).
- My Calendar storage reuses the existing tables with league value `"cricket-team"`:
  - `calendar_subscriptions.filters` stores `{ "teamId": "6", "formats": [...] }`.
  - A migration extends both tables' `league` check constraints and replaces
    `unique (calendar_id, league)` with uniqueness on
    `(calendar_id, league, coalesce(filters->>'teamId',''))` so multiple teams can be
    followed while league subscriptions keep one-row-per-league semantics.
  - Pinned cricket matches store `espn_event_id` as `"{seriesId}:{eventId}"` so the feed
    can resolve them via the series scoreboard without a discovery scan.
- The shared cricket-team event type extends the IPL Site-API shape (competitors/logos
  inline) with `seriesId`, `seriesName`, `format`, `formatDetail` (the competition
  description, e.g. "2nd T20I"), and `endDate`.
- Home layout: filter sections on top (Teams row with logos, Leagues row); with no
  selection the existing five-tile navigation grid renders as today; with a selection
  the merged schedule and its calendar-links panel (download + per-source feed links +
  save) render in its place and the navigation grid moves below the schedule. League
  tiles keep navigating to the unchanged per-league pages.
- Selections persist in `localStorage` via the existing `useLocalStorageState` hook
  (no URL params — home stays a single route).
- Each selected source is fetched whole (`fetchAll<League>Events` /
  `fetchAllCricketTeamEvents`) rather than ref-paginated — required to interleave
  sources chronologically (a team plays ~30–60 matches in the window; league seasons
  are already fetched whole by the download/feed paths today). Default view shows
  upcoming events; past events behind the existing show-past toggle pattern.
- League events in the merged list render with each league's existing card components,
  adapted where needed to accept a pre-fetched event instead of a `$ref`.
- ESPN endpoints are unofficial and may change; same standing caveat as `docs/ESPN_API.md`.

## Tech Stack

Existing stack unchanged (React 19, TS 5.9, Vite 7, TanStack Router/Query, Tailwind 4 +
shadcn/ui, Hono on Deno, `ics`, Supabase). No new dependencies. One new SQL migration.

## Commands

```
Dev (client):        npm run dev
Build:               npm run build
Test:                npm run test:run
Lint:                npm run lint
Format check:        npm run format:check
Local Supabase:      supabase start && supabase functions serve
Apply migrations:    supabase db reset   (local)  /  supabase db push  (remote)
Deploy function:     supabase functions deploy calendar
```

## Project Structure

```
shared/src/cricketTeam/
├── types.ts        → CricketTeamEvent, CricketTeamFilters, format enum,
│                     CRICKET_NATIONAL_TEAMS curated list (ids/names/logos)
├── discovery.ts    → discoverTeamSeriesIds(teamId): header-endpoint date scan
├── fetch.ts        → fetchAllCricketTeamEvents(teamId): discovery → series
│                     calendars → per-date scoreboards → normalize + filter by team
├── filters.ts      → filterCricketTeamEvents (formats)
└── transform.ts    → transformCricketTeamEventsToIcs (endDate-aware durations)

client/components/cricket-teams/
├── cricket-team-event-card.tsx      → card (series name + format badge; IPL-style)
└── utils/                           → feed-URL builder

client/components/home/
├── home-filters.tsx                 → Teams + Leagues multi-select chip rows
├── combined-schedule.tsx            → merged chronological list (per-league cards)
├── selection-calendar-links.tsx     → download + per-source feed links + save
└── utils/useCombinedSchedule.ts     → per-source queries → merge/sort/format-filter

client/routes/index.tsx                   → home: filters + grid ⁄ merged schedule

supabase/functions/calendar/index.ts      → + GET /calendar/cricket-team/:teamId.ics
supabase/functions/_shared/params.ts      → + teamId/formats param parsing
supabase/functions/calendar/personalFeed.ts → + cricket-team subscription/pin branch
supabase/migrations/<ts>_cricket_team_subscriptions.sql → constraint changes
client/api/calendar/types.ts              → League union + "cricket-team", filter shape
docs/ESPN_API.md                          → cricket series-discovery section
```

Tests colocated (`*.test.ts(x)`) as elsewhere in the repo.

## Code Style

Match the repo: named exports, `@/` client alias, shared logic in
`@sports-calendar/shared`, generic base components with injected league functions, and
docstrings on fetchers explaining ESPN quirks (as in `shared/src/ipl/fetch.ts`).

```ts
// shared/src/cricketTeam/fetch.ts (shape sketch)
export async function fetchAllCricketTeamEvents(
  teamId: string
): Promise<CricketTeamEvent[]> {
  const seriesIds = await discoverTeamSeriesIds(teamId); // header scan, 3-day cadence
  const perSeries = await mapWithConcurrency(seriesIds, FETCH_CONCURRENCY, async id => {
    const dates = await fetchSeriesCalendar(id); // leagues[0].calendar
    const byDate = await mapWithConcurrency(dates, FETCH_CONCURRENCY, d =>
      fetchSeriesEventsByDate(id, d)
    );
    return byDate.flat().filter(e => hasCompetitor(e, teamId));
  });
  return dedupeById(perSeries.flat()).sort(byDate);
}
```

## Testing Strategy

- Vitest, colocated. Record real ESPN responses as fixtures (header page, series
  scoreboard with calendar, match-date scoreboard) alongside the existing
  `supabase/functions/calendar/fixtures/`.
- Unit tests: discovery date-sampling + series extraction, event normalization (format
  mapping, endDate), format filters, ICS transform (multi-day Test event), param
  parsing, feed-URL builder, pin-ID `{seriesId}:{eventId}` round-trip.
- Backend: calendar-function tests for the new route and the personal-feed branch,
  mocked like the existing league routes.
- Manual smoke: load India's page, verify the known series appear; subscribe the feed;
  save team + pin a match; verify combined ICS.

## Boundaries

- **Always:** run `npm run lint`, `npm run format:check`, `npm run test:run`,
  `npm run build` before commits; keep RLS intact; validate `teamId` against the curated
  list server-side; keep existing league behavior untouched.
- **Ask first:** widening the discovery window/cadence beyond the stated budget; schema
  changes beyond the constraint migration described; any new dependency; changes to
  existing feed endpoints.
- **Never:** commit secrets; scrape/bypass the bot-blocked ESPNcricinfo API; remove or
  weaken existing tests; break existing per-league feed URLs or subscription rows.

## Success Criteria

- With nothing selected, the home page renders the existing navigation grid and issues
  no schedule fetches.
- Selecting India (team 6) on home lists its matches across at least the currently
  published tours (as of authoring: Zimbabwe, Sri Lanka, West Indies, New Zealand
  series) sorted chronologically with correct format badges and series names; adding
  the NBA league interleaves NBA games into the same list with NBA cards, and the
  download contains both sources.
- Filtering to "Test" hides limited-overs cricket matches in the list, the download,
  and the cricket-team feed URL (league events are unaffected).
- `GET /calendar/cricket-team/6.ics` returns valid ICS spanning multiple series; a Test
  match spans multiple days; an unknown team ID is rejected.
- A signed-in user can follow two different teams simultaneously; both rows appear on My
  Calendar and in the combined personal feed; pinned matches resolve correctly.
- Existing league pages, feeds, personal calendars, and all prior tests are unaffected.
- `npm run test:run`, `npm run build`, `npm run lint`, `npm run format:check` pass.

## Open Questions

None — direction confirmed 2026-07-17 (cricket national teams only; full parity
affordances; curated 12 teams). Revised same day after T1: the picker/team-page UX was
replaced by Teams + Leagues filters on the home page populating one merged schedule;
per-league pages unchanged.
