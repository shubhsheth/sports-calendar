# Tasks: Cricket Team Calendars

Each task ends in a compiling, testable state. Verify after each with the CI gate:
`npm run lint && npm run format:check && npm run test:run && npm run build`.
Backend tasks additionally run the calendar function's Deno tests.

Plan summary: build bottom-up in `shared/` (types → discovery → fetch → filter/transform),
then the home-page browse surface as a vertical slice (selection state/filters → merged
schedule data → merged schedule UI → calendar links), then the backend feed, then the My
Calendar integration (migration → backend branch → client), then analytics, docs, and
full verification. T1–T4 are strictly sequential; T5–T7 (client) and T8 (backend feed)
can proceed in parallel after T4; T9–T11 are sequential after T8.

> **Revised 2026-07-17 (after T1):** the original T5–T7 (picker page, team page,
> team-page links) were replaced when the UX pivoted to home-page Teams + Leagues
> filters over one merged schedule. T1–T4 and T8–T14 are unaffected in substance;
> T5–T7 below reflect the new surface.

Key risk (checked early, in T2): the discovery scan's coverage depends on the header
endpoint returning every series active on a sampled date — T2's fixtures must include a
multi-series day to lock that behavior in.

- [x] **T1 — Shared types, curated teams, fixtures.** `shared/src/cricketTeam/types.ts`:
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

- [ ] **T5 — Home selection state + filters.** `client/components/home/home-filters.tsx`:
  Teams chip row (12 from `CRICKET_NATIONAL_TEAMS`, with logos) and Leagues chip row
  (NBA/NFL/F1/IPL/FIFA), multi-select, persisted with `useLocalStorageState`; cricket
  format pills appear when at least one team is selected. `client/routes/index.tsx`
  renders the filters above the existing grid; with no selection the page is unchanged
  (no schedule fetches).
  - Acceptance: selections toggle and survive reload; empty selection renders today's
    grid untouched.
  - Verify: CI gate green; component test for toggle/persist/empty states.
  - Files: `home-filters.tsx` (+ test), `client/routes/index.tsx`,
    `client/components/home/utils/selectionState.ts` (+ test).
  - Size: M

- [ ] **T6 — Combined schedule data layer.** `client/components/home/utils/
  useCombinedSchedule.ts`: one React Query entry per selected source
  (`fetchAllCricketTeamEvents` per team, `fetchAll<League>Events` per league), merged
  into a single chronologically sorted list of tagged entries
  (`{source, league|teamId, event}`), cricket format filter applied, default upcoming
  view with the existing show-past toggle pattern, per-source loading/error surfaced.
  - Acceptance: unit tests (mocked fetchers) cover merge ordering across sources,
    format filtering, partial-failure surfacing, and no fetch when nothing selected.
  - Verify: `npm run test:run`; CI gate green.
  - Files: `useCombinedSchedule.ts` (+ test).
  - Size: S

- [ ] **T7 — Merged schedule UI + calendar links.** `combined-schedule.tsx` renders the
  merged list: cricket entries via new `cricket-teams/cricket-team-event-card.tsx`
  (IPL-style + series name + format badge), league entries via each league's existing
  card (adapted to accept a pre-fetched event where they currently take a `$ref`).
  `selection-calendar-links.tsx`: one `.ics` download of the whole filtered selection
  (reuses per-league + cricket-team transforms) and per-source feed links
  (existing league URLs; `cricket-teams/utils/buildCricketTeamFeedUrl.ts` →
  `/cricket-team/{teamId}.ics?formats=…`). Navigation grid moves below the schedule
  while a selection is active.
  - Acceptance: mixed selection renders correct card styles in one chronological list;
    download contains all selected sources filtered; feed links encode team + formats.
  - Verify: CI gate green; card + feed-URL unit tests; manual smoke: India + NBA on
    live ESPN, download inspected.
  - Files: `combined-schedule.tsx`, `cricket-team-event-card.tsx` (+ test),
    `selection-calendar-links.tsx`, `buildCricketTeamFeedUrl.ts` (+ test).
  - Size: M

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

- [ ] **T11 — Client My Calendar integration.** Home selection panel: "Save to My
  Calendar" per selected cricket team (upsert `cricket-team` + teamId + formats;
  reflects saved state) and pin/unpin on merged-schedule cricket cards storing
  `"{seriesId}:{eventId}"`; signed-out clicks prompt sign-in (existing pattern).
  My Calendar page lists cricket-team subscriptions (team name + format pills) and
  resolves cricket pins (extend `fetchPinnedEventDetails` using the composite id).
  - Acceptance: two teams saveable simultaneously; rows removable; pins resolve to
    name/date; component tests for signed-in/out.
  - Verify: CI gate green.
  - Files: `selection-calendar-links.tsx`, `pin-event-button.tsx` wiring in the cricket
    card, `client/api/calendar/fetchPinnedEventDetails.ts`, my-calendar components.
  - Size: M

- [ ] **T12 — Analytics.** Typed events per `client/lib/analytics.ts` conventions with
  league `"cricket-team"`: home team/league selection toggles, format filter toggles,
  selection download, feed-link clicks, save/pin — matching what existing leagues track.
  - Acceptance: every user action tracked on league pages has its home-surface
    equivalent.
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

- [ ] **T14 — Full verification.** CI gate green. Manual round trip: select India +
  NBA on home → merged list shows both with correct cards/formats → filter to Tests →
  download ICS (both sources) → subscribe team feed URL → save two teams + pin one
  match → My Calendar shows all → combined feed contains both teams' (filtered)
  matches + the pin, deduped. Empty-selection home identical to today; anonymous smoke
  of all five league routes and feeds unchanged.
  - Acceptance: every FR demonstrated; success criteria in the spec all hold.
  - Verify: manual checklist + full test suite.
  - Files: none (verification only).
  - Size: S

FR coverage: FR-1→T5 · FR-2→T2/T3/T6/T7 · FR-3→T4/T5/T6/T8 · FR-4→T4/T7 · FR-5→T8 ·
FR-6→T9/T10/T11 · FR-7→T3/T4 · FR-8→T9 (constraint preservation)/T14. No gaps found.
(Note: repo precedent from spec 003 keeps full verification as the final task, after the
documentation task.)
