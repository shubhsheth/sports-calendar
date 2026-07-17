# Tasks: Cricket Team Calendars

Each task ends in a compiling, testable state. Verify after each with the CI gate:
`npm run lint && npm run format:check && npm run test:run && npm run build`.
Backend tasks additionally run the calendar function's Deno tests.

Plan summary: build bottom-up in `shared/` (types → discovery → fetch → filter/transform),
then the client pages as a vertical slice, then the backend feed, then the My Calendar
integration (migration → backend branch → client), then analytics, docs, and full
verification. T1–T4 are strictly sequential; T5–T7 (client) and T8 (backend feed) can
proceed in parallel after T4; T9–T11 are sequential after T8.

Key risk (checked early, in T2): the discovery scan's coverage depends on the header
endpoint returning every series active on a sampled date — T2's fixtures must include a
multi-series day to lock that behavior in.

- [ ] **T1 — Shared types, curated teams, fixtures.** `shared/src/cricketTeam/types.ts`:
  `CricketTeamEvent` (extends the IPL Site-API event shape with `seriesId`, `seriesName`,
  `format`, `endDate`), `CricketMatchFormat` (`test | odi | t20i | other`),
  `CricketTeamFilters` (`formats: CricketMatchFormat[]`), `CRICKET_NATIONAL_TEAMS` (the 12
  verified ICC full members: id, name, abbreviation, logo CDN URL), and
  `CRICKET_TEAM_DISCOVERY` window constants (lookback 1 month, lookahead 6 months, 3-day
  cadence). Record real ESPN fixtures for later tasks: one header response with several
  series, one series scoreboard showing `leagues[0].calendar`, one match-date scoreboard
  (ideally including a Test with `endDate`).
  - Acceptance: types compile and are exported from `shared/src/index.ts`; fixtures
    checked in under `supabase/functions/calendar/fixtures/`.
  - Verify: CI gate green.
  - Files: `shared/src/cricketTeam/types.ts`, `shared/src/index.ts`, 3 fixture JSONs.
  - Size: S

- [ ] **T2 — Series discovery.** `shared/src/cricketTeam/discovery.ts`:
  `getDiscoverySampleDates()` (3-day cadence across the window) and
  `discoverTeamSeriesIds(teamId)` — fetch the header endpoint per sample date via
  `mapWithConcurrency`, collect distinct series IDs (+ names) where the team appears as a
  competitor, skipping (not failing on) individual fetch errors. Docstring documents the
  endpoint, the no-date-range limitation, and the sub-3-day-series accepted risk.
  - Acceptance: given fixture responses, returns the correct deduped series set for a
    team; a throwing sample date is skipped.
  - Verify: `npm run test:run` (new `discovery.test.ts`); CI gate green.
  - Files: `discovery.ts`, `discovery.test.ts`.
  - Size: S

- [ ] **T3 — Team event fetch + normalization.** `shared/src/cricketTeam/fetch.ts`:
  `fetchSeriesCalendar(seriesId)` (undated scoreboard → `leagues[0].calendar`),
  `fetchSeriesEventsByDate(seriesId, date)` (normalize like `ipl/fetch.ts`, plus
  `format` from `competitions[0].class.internationalClassId` (1/2/3 → test/odi/t20i,
  else other), `seriesId`/`seriesName`, `endDate`), and `fetchAllCricketTeamEvents(teamId)`
  = discovery → calendars → per-date events → keep events with the team as competitor →
  dedupe by id → sort by date.
  - Acceptance: fixture-driven tests cover normalization (format mapping, endDate,
    competitor filter) and orchestration (dedupe, ordering).
  - Verify: `npm run test:run`; CI gate green.
  - Files: `fetch.ts`, `fetch.test.ts`.
  - Size: S

- [ ] **T4 — Filters + ICS transform.** `shared/src/cricketTeam/filters.ts`
  (`filterCricketTeamEvents` by formats; empty selection = all) and
  `shared/src/cricketTeam/transform.ts` (`transformCricketTeamEventsToIcs`: title
  "India vs Zimbabwe — 2nd T20I" style with series name in the description; Tests span
  `date → endDate`; single-day formats use per-format durations; emits `uid` for feed
  dedupe like other leagues). Export the module from `shared/src/index.ts`.
  - Acceptance: unit tests cover each format filter, the multi-day Test event, and
    duration defaults.
  - Verify: `npm run test:run`; CI gate green.
  - Files: `filters.ts`, `filters.test.ts`, `transform.ts`, `transform.test.ts`,
    `shared/src/index.ts`.
  - Size: M

- [ ] **T5 — Team picker page.** `client/routes/cricket-teams.tsx` rendering
  `client/components/cricket-teams/team-picker-grid.tsx` (12 teams from
  `CRICKET_NATIONAL_TEAMS`, logos, links to `/cricket-teams/$teamId`); home page grid
  gains a Cricket Teams tile.
  - Acceptance: picker renders all 12 teams; navigation works under the app base path.
  - Verify: CI gate green; component test for the grid.
  - Files: route, `team-picker-grid.tsx` (+ test), `client/routes/index.tsx`.
  - Size: S

- [ ] **T6 — Team schedule page.** `client/routes/cricket-teams.$teamId.tsx`: one
  `useQuery` on `fetchAllCricketTeamEvents` (React Query defaults), chronological list of
  `cricket-team-event-card.tsx` (IPL-style card + series name + format badge + live/past
  status), `cricket-team-filter-selector.tsx` format pills with toggle helpers in
  `client/components/cricket-teams/utils/`. Unknown team IDs show a not-found state.
  - Acceptance: filters narrow the list; loading/error/empty states present; card test
    and toggle-helper test pass.
  - Verify: CI gate green; manual smoke against live ESPN for team 6.
  - Files: route, card (+ test), filter selector, `utils/filterState.ts` (+ test).
  - Size: M

- [ ] **T7 — Download + feed links.** Team page gets the one-time `.ics` download (reuse
  the shared transform; events already fetched, filtered client-side) and
  `add-to-calendar-feed-links.tsx` wired to
  `client/components/cricket-teams/utils/buildCricketTeamFeedUrl.ts`
  (`/cricket-team/{teamId}.ics?formats=…`).
  - Acceptance: download produces ICS matching current filters; feed links encode team +
    formats.
  - Verify: CI gate green; `buildCricketTeamFeedUrl` unit test; manual download check.
  - Files: team route, `buildCricketTeamFeedUrl.ts` (+ test).
  - Size: S

- [ ] **T8 — Backend team feed.** `supabase/functions/_shared/params.ts`: parse/validate
  `teamId` (must be one of the curated 12) and `formats`. `functions/calendar/index.ts`:
  `GET /calendar/cricket-team/:teamId.ics` → `fetchAllCricketTeamEvents` →
  `filterCricketTeamEvents` → transform → `createEvents` + `icsHeaders()`; unknown team
  → 400. Function tests with the recorded fixtures (valid team, format filter, bad team).
  - Acceptance: endpoint returns valid ICS across multiple series; rejects unknown IDs.
  - Verify: Deno function tests; CI gate green.
  - Files: `params.ts` (+ test), `index.ts`, `index.test.ts`.
  - Size: M

- [ ] **T9 — Subscription schema migration + client types.** New migration: extend both
  `league` check constraints with `'cricket-team'`; replace
  `unique (calendar_id, league)` with a unique index on
  `(calendar_id, league, coalesce(filters->>'teamId',''))` (league rows keep single-row
  semantics since their filters lack `teamId`). Client: `League` union +
  `"cricket-team"`, `SubscriptionFilters` + `{ teamId, formats }` shape.
  - Acceptance: migration applies cleanly; two cricket-team rows with different teamIds
    coexist, duplicate teamId rejected, existing league uniqueness preserved.
  - Verify: migration applied against local Postgres with assertion script (see 003 T1
    notes for the stubbed-Supabase approach); CI gate green.
  - Files: `supabase/migrations/<ts>_cricket_team_subscriptions.sql`,
    `client/api/calendar/types.ts`.
  - Size: S

- [ ] **T10 — Personal feed backend branch.** `functions/calendar/personalFeed.ts`:
  handle `cricket-team` subscriptions (validate stored filters → fetch team events →
  format filter → transform) and pinned events (`espn_event_id` = `"{seriesId}:{eventId}"`
  → series calendar → matching event), deduped by `uid` with the rest of the feed.
  - Acceptance: fixture tests cover a cricket-team subscription, a pinned match, and
    dedupe when a pin matches the subscription.
  - Verify: Deno function tests; CI gate green.
  - Files: `personalFeed.ts` (+ test), `_shared/personalCalendar.ts` if types need it.
  - Size: S

- [ ] **T11 — Client My Calendar integration.** Team page: "Save to My Calendar" (upsert
  `cricket-team` + teamId + formats; reflects saved state) and pin/unpin on match cards
  storing `"{seriesId}:{eventId}"`; signed-out clicks prompt sign-in (existing pattern).
  My Calendar page lists cricket-team subscriptions (team name + format pills) and
  resolves cricket pins (extend `fetchPinnedEventDetails` using the composite id).
  - Acceptance: two teams saveable simultaneously; rows removable; pins resolve to
    name/date; component tests for signed-in/out.
  - Verify: CI gate green.
  - Files: team route, `save-league-button.tsx`/`pin-event-button.tsx` wiring,
    `client/api/calendar/fetchPinnedEventDetails.ts`, my-calendar components.
  - Size: M

- [ ] **T12 — Analytics.** Typed events per `client/lib/analytics.ts` conventions with
  league `"cricket-team"`: team page view (team id), format filter toggles, download,
  feed-link clicks, save/pin — matching what existing leagues track.
  - Acceptance: every user action tracked on league pages has its team-page equivalent.
  - Verify: CI gate green.
  - Files: `client/lib/analytics.ts`, call sites in cricket-teams components.
  - Size: S

- [ ] **T13 — Update documentation.** `docs/ESPN_API.md`: cricket series-discovery
  section (header endpoint, series calendars, no team endpoint, format `class` field,
  verified team-ID table, Core-API team-events endpoint noted for future sports).
  `docs/PROJECT_OVERVIEW.md`: new module/routes/data flow. `docs/BACKEND.md`: new feed
  endpoint + params + schema change. CLAUDE.md if any new commands/boundaries.
  - Acceptance: new endpoints, module, routes, and migration are reflected; no stale
    references remain.
  - Verify: review CLAUDE.md and affected docs/*.md for accuracy.
  - Files: `docs/ESPN_API.md`, `docs/PROJECT_OVERVIEW.md`, `docs/BACKEND.md`, `CLAUDE.md`.
  - Size: S

- [ ] **T14 — Full verification.** CI gate green. Manual round trip: India team page
  lists matches across the currently published series with correct formats → filter to
  Tests → download ICS → subscribe feed URL → save team + a second team + pin one match
  → My Calendar shows all → combined feed contains both teams' (filtered) matches + the
  pin, deduped. Anonymous smoke of all five league routes and feeds unchanged.
  - Acceptance: every FR demonstrated; success criteria in the spec all hold.
  - Verify: manual checklist + full test suite.
  - Files: none (verification only).
  - Size: S

FR coverage: FR-1→T5 · FR-2→T2/T3/T6 · FR-3→T4/T6/T8 · FR-4→T4/T7 · FR-5→T8 ·
FR-6→T9/T10/T11 · FR-7→T3/T4 · FR-8→T9 (constraint preservation)/T14. No gaps found.
(Note: repo precedent from spec 003 keeps full verification as the final task, after the
documentation task.)
