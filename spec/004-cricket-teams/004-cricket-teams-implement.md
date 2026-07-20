# Implement: Cricket Team Calendars

Execution log for the SPECIFY → TASKS → IMPLEMENT workflow. Tasks are defined in
`004-cricket-teams-tasks.md`. Work one task at a time; check it off here and in tasks.md
after the human approves the increment.

## Conventions
- Commands: CI gate = `npm run lint && npm run format:check && npm run test:run &&
  npm run build` · function tests = Deno test harness under `supabase/functions/` ·
  migrations = `supabase db reset` (local; see 003 notes for the stubbed-Postgres
  fallback when the Supabase CLI is unavailable).
- Client imports: named exports, `@/` alias; shared logic only from
  `@sports-calendar/shared`; league-specific behavior injected into generic base
  components.
- Analytics league value: `"cricket-team"`.

## Reference (verified during research, 2026-07-17 — live ESPN fetches)
- **Discovery endpoint:**
  `https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&dates=…`
  → `sports[0].leagues[]` = every series with a match in the span; each league has
  `id`, `name`, `isTournament`, `events[]` with `competitors[] {id, displayName}`.
  `dates=` takes `YYYYMMDD` or `YYYYMM`; ranges (`A-B`) and comma lists return empty.
  Month-mode quirks (all verified live 2026-07-18): fully past months permanently
  return empty; a month's first-ever request can return empty while ESPN warms its
  cache (retry succeeds); the current month truncates events a few days past "today";
  busy leagues' event lists get chronologically truncated (The Hundred cut at 20
  events mid-August while another league listed 48 — no fixed cap). Coarse sampling
  is UNSAFE: alternate-day bilateral series phase-lock between samples (a 3-day
  cadence missed India's Zimbabwe + West Indies series). Hence the hybrid in
  `discovery.ts`: daily for lookback + current month, monthly forward, retry →
  daily-fallback for empty months, daily top-up after a truncation-suspect league's
  last listed day (threshold ≥15 events). ~45–50 requests, ~8 s at concurrency 8.
  Responses are gzipped (irrelevant to `fetch`, but curl needs `--compressed`).
- **Series calendar:** `https://site.api.espn.com/apis/site/v2/sports/cricket/{seriesId}/scoreboard`
  (dated or not) always carries `leagues[0].calendar` = ISO list of the series' match
  dates. Undated returns only the nearest day's events — always walk the calendar.
- **Events:** `…/{seriesId}/scoreboard?dates=YYYYMMDD` — same inline shape as
  `shared/src/ipl/fetch.ts` (`ScoreboardEvent`), plus per event: `endDate`, and
  `competitions[0].class` = `{ internationalClassId: "3", generalClassCard: "T20I",
  eventType: "T20", name: "Twenty20 Internationals" }` (1=Test, 2=ODI, 3=T20I) and
  `competitions[0].description` e.g. `"2nd T20I"`.
- **Verified team IDs (men's full members):** England 1 · Australia 2 · South Africa 3 ·
  West Indies 4 · New Zealand 5 · India 6 · Pakistan 7 · Sri Lanka 8 · Zimbabwe 9 ·
  Bangladesh 25 · Ireland 29 · Afghanistan 40. Women's/U19 sides have distinct IDs
  (e.g. England U19 = 971) — the competitor `id` check must be exact.
- **Live India example (research day):** series 24301 (tour of Zimbabwe, calendar
  2026-07-23/25/26), 24567 (tour of Sri Lanka), 24289 (West Indies tour of India),
  24469 (tour of New Zealand) — good manual-smoke targets while current.
- **Dead ends (don't retry):** cricket on Core API (`/v2/sports/cricket/leagues` →
  empty), any `…/cricket/**/teams*` Site-API shape (404/400), `core.espnuk.org`
  (connection refused), `hs-consumer-api.espncricinfo.com` (Akamai bot-blocked).
- **Schema today:** both `calendar_subscriptions` and `calendar_pinned_events` have
  `league text check (league in ('nba','nfl','f1','ipl','fifa'))`; subscriptions have
  `unique (calendar_id, league)` — T9 relaxes both.
- **Future sports (out of scope, verified):** Core API
  `…/{sport}/leagues/{league}/seasons/{yr}/teams/{id}/events` returns the standard
  `$ref` page (Lakers 2026 → 98 events); Site API `…/{league}/teams` lists teams with
  logos; soccer team IDs are global across league slugs (Barcelona = 83 in `esp.1` and
  `uefa.champions`).

## Progress
- [x] T1 — Shared types, curated teams, fixtures
- [x] T2 — Series discovery
- [x] T3 — Team event fetch + normalization
- [x] T4 — Filters + ICS transform
- [x] T5 — Home segmented selector (rework)
- [x] T6 — Team schedule page (rework)
- [x] T7 — Team page download + feed links (rework)
- [x] T8 — Backend team feed
- [x] T9 — Subscription schema migration + client types
- [x] T10 — Personal feed backend branch
- [x] T11 — Client My Calendar integration
- [x] T12 — Analytics
- [x] T13 — Update documentation
- [x] T14 — Full verification

## Deploy-time checklist (environment-blocked; must run before/at deploy)
This container has no Supabase CLI, Docker, or real Supabase project, so these
success-criteria facets were verified by proxy (stubbed Postgres, Deno fixture
tests, mocked supabase-js) and must be confirmed against the real stack:
1. Apply the migration: `supabase db push` (or `db reset` locally) — re-run the
   T9/T11 assertion script against the real DB if convenient.
2. Deploy the function: `supabase functions deploy calendar` (CI does this on
   `supabase/functions/**` or `shared/**` changes via deploy-functions.yml).
3. Signed-in round trip on the deployed stack: follow India + Australia from
   their team pages → both appear on My Calendar → open the personal feed URL
   in a real calendar app → both teams' matches present, plus any pinned match,
   deduped. Pin a match, confirm it resolves to name/date.
4. Subscribe `…/cricket-team/6.ics` directly in a calendar app; confirm it
   refreshes (new series appear) on the app's next poll.

## Notes
- **T14 (2026-07-19):** full verification. CI gate green (lint 18 pre-existing
  warnings/0 errors, format clean, 252 vitest, build ok); Deno suites 5 + 9
  green; `tsc -p shared` clean, `tsc -b tsconfig.app` only the 2 pre-existing
  my-calendar test-cast errors. Live ESPN round trip: India 52 matches
  (9 Test/20 ODI/23 T20I) → Test filter 9 → 52-VEVENT ICS with multi-day
  DTEND; Australia 34 matches (13 Test) → valid ICS — proves multi-team +
  multi-day. Browser round trip (Playwright + intercepted fixtures, sandbox
  has no outbound net): 10/10 checks — Leagues tab = existing grid with no
  cricket fetches, Teams tab 12 tiles persisting across reload, India tile →
  team page (series card, "3rd T20I" badge, calendar links, download),
  Test-only filter empties the T20I list, unknown id → not-found. Success
  criteria all met except the real-Supabase/calendar-app facets above.
- **T13 (2026-07-19):** ESPN_API.md gains the cricket series-discovery section
  (endpoint quirks, dead ends, verified team ids) plus a future-sports note
  (Core per-team events endpoint, global soccer ids); BACKEND.md documents the
  cricket-team route, team_key uniqueness, and composite pin ids;
  PROJECT_OVERVIEW.md updates the objective, trees, patterns, analytics league
  list, and data flow. CLAUDE.md untouched — it contains only behavioral
  guidelines, no commands/endpoints to update (checked, not assumed).
- **T12 (2026-07-19):** two new typed events (`home_tab_selected`,
  `cricket_team_selected`); everything else reuses the generic per-league
  functions with league "cricket-team" — format pills via
  `filterEventTypeToggled`, show-past via `filterShowPastEventsToggled`,
  download via `calendarDownloaded`; feed links, save, pin/unpin, and remove
  already flowed the league value through the shared components. Router
  pageview covers team-page views (same as league pages — no bespoke event).
- **T11 (2026-07-19):** found and fixed a latent T9 break: the client upsert
  targeted `onConflict: "calendar_id,league"`, a constraint the migration had
  dropped — and PostgREST cannot target expression indexes. The migration now
  creates a stored generated column `team_key` (mirrors `filters->>'teamId'`)
  with a plain `unique (calendar_id, league, team_key)` constraint, keeping
  ONE upsert path for leagues and cricket teams alike (re-verified in
  Postgres, incl. ON CONFLICT upserts for both row kinds — 8 assertions).
  `removeSubscription` gained an optional `teamId` (filters by `team_key`);
  SaveLeagueButton matches cricket subscriptions per `filters.teamId`; the
  cricket card pins `"{seriesId}:{eventId}"`; `fetchPinnedEventDetails`
  resolves cricket pins from the series' match days cached per series; My
  Calendar rows label cricket subscriptions by team name with format
  summaries and remove per team. LEAGUE_LABELS gained "cricket-team"
  (Record<League,…> had been a latent type error since T9 — the CI gate never
  typechecks).
- **UX pivot (2026-07-17, after T1):** the picker page + dedicated team page were
  replaced by Teams + Leagues multi-select filters on the home page populating one
  merged chronological schedule (league pages unchanged; teams filter = the 12
  cricket sides). Cascaded through specify.md (Objective, stories, FR-1..4/6,
  NFR-2a, Assumptions, Project Structure, Success Criteria) and tasks.md (T5–T7
  replaced; T11/T12/T14 retargeted). Shared layer T2–T4 unaffected. Home layout:
  filters on top; no selection → today's grid, no fetches; selection → calendar-links
  panel + merged schedule, grid moves below. Selection persists via
  `useLocalStorageState`.
- **UX pivot #2 (2026-07-19, after first T5–T7 landed):** human rejected events on
  the home page ("just a team or league selector"). Final shape per follow-up Q&A:
  segmented Leagues | Teams chips on home switching tile grids; team tiles navigate
  to dedicated `/cricket-teams/{teamId}` pages carrying the schedule + filters +
  calendar links. Cascaded through specify.md and tasks.md (T5–T7 re-scoped,
  T11/T12/T14 retargeted). Kept from the first build: shared layer,
  `cricket-team-event-card`, `buildCricketTeamFeedUrl`, format-pill UX. Removed:
  `home-filters`, `selectionState` multi-select, `useCombinedSchedule`,
  `combined-schedule`, `selection-calendar-links`, and the league cards' `event`
  prop adaptations (reverted to ref-only).
- **T10 (2026-07-19):** cricket runs as its own slice (`buildCricketTeamIcsEvents`)
  beside the league loop, kicked off concurrently and merged before the UID
  dedupe — the league pipeline map assumes one arg-less fetch per league and
  can't express N-teams-per-league. Pins resolve via `fetchSeriesCalendar` +
  per-day fetches only (test asserts zero header/discovery calls); malformed
  pin ids and unknown-team subscriptions log + skip. All 9 my-feed Deno tests
  green.
- **T9 (2026-07-19):** migration also adds a check the spec didn't spell out:
  `cricket-team` rows must carry `filters->>'teamId'` (a teamId-less row would
  silently collide via `coalesce('')` with league semantics). Verified against
  the container's PostgreSQL 16 with a stubbed Supabase env (auth.users,
  auth.uid(), authenticated/anon roles; script piped via stdin because the
  postgres system user can't traverse the scratchpad path): both migrations
  apply cleanly; assertions — two teams coexist, duplicate teamId rejected,
  one-row-per-league preserved, teamId required, cricket-team pin accepted,
  unknown league rejected, RLS intact. Re-run `supabase db reset` before
  deploying (T14 checklist).
- **T8 (2026-07-19):** route is `/calendar/cricket-team/:file` with a numeric
  `(\d+)\.ics` gate (404) before curated-team validation (400) — mirrors the
  personal feed's file-pattern style rather than `registerLeagueRoute` (which
  has no path params). Empty filtered results return a valid empty VCALENDAR
  (verified `createEvents([])` yields a value, not an error). Deno test env:
  the repo's deno.lock needs a recent Deno (2.1.x panics on startup; 2.9.3
  works) — installed via deno.land installer, not in the CI gate. Test fetch
  mock: cricket handlers (`/scoreboard/header`, `/cricket/24301/scoreboard`)
  must precede the generic IPL `/cricket/…/scoreboard` branch.
- **T5–T7 rework (2026-07-19):** home-selector.tsx (segmented chips +
  `TeamTileGrid`; tab persisted via `utils/homeTab.ts` — non-component exports
  split out for the react-refresh lint rule); team route
  `cricket-teams.$teamId.tsx` (one query, format pills + show-past via
  `cricket-team-filter-selector.tsx`/`utils/filterState.ts`, not-found /
  loading / error / empty states); `cricket-team-calendar-links.tsx` (download
  `{team}-cricket.ics` + AddToCalendarFeedLinks). Deleted the entire rejected
  surface; league cards reverted via `git checkout 9c58bf6 --`. Landed as ONE
  commit — the pieces don't compile independently (team tiles use the typed
  route). Playwright smoke (intercepted fixtures): default Leagues tab
  identical to before, 12 team tiles, tab persistence, India page schedule +
  links, Test-filter empties T20I list, unknown id → not-found.
- **T7 (first build, superseded — 2026-07-19):** ref-based league cards (nba/nfl/f1/fifa) gained an
  optional `event` prop (query `enabled: !event`) so the merged list passes
  pre-fetched events; cards' internal re-filter gets a keep-all filter from
  `combined-schedule.tsx`. Cricket card has no pin button yet (League union
  lacks "cricket-team" until T9/T11). Download builds ICS client-side from the
  already-filtered entries via each source's shared transform
  (`sports-calendar.ics`); live-feed links per source in collapsibles —
  cricket via `buildCricketTeamFeedUrl`, leagues via unfiltered
  `buildCalendarFeedUrl` (league pages remain the place for filtered feeds).
  **CORS verified live**: `site.web.api.espn.com` header endpoint sends
  `access-control-allow-origin: *` (curl with Origin), so client-side
  discovery works in prod. Visual smoke via Playwright + route interception
  (sandbox browser can't reach the internet — external requests
  connection-reset; NOT an app issue): empty state unchanged, India selection
  renders series card ("3rd T20I" badge, venue), Test-only filter empties the
  T20I list, show-past reveals earlier days. AddToCalendarFeedLinks hides
  without `VITE_CALENDAR_FEED_BASE_URL` (existing guard) — feed links appear
  only in configured envs.
- **T6 (2026-07-19):** `useCombinedSchedule(selection, showPastEvents)` → two
  `useQueries` batches (keys `["home","cricket-team",teamId]` /
  `["home","league",league]`), cricket deduped by event id across teams (two
  selected teams sharing a match), each league filtered through its own
  `filter<League>Events` (past rule reused), `CombinedEntry` discriminated on
  `source` for T7's card dispatch, failed sources surfaced by label. For T7:
  league cards must handle events whose `competitions` survived league
  filtering (NBA/NFL filters operate per-competition and require
  `event.competitions` — a test fake without it throws in render).
- **T5 (2026-07-19):** `HomeFilters` takes callbacks (`onToggleTeam/League/Format`)
  rather than a setState — index.tsx wires them to the pure `selectionState`
  helpers over `useLocalStorageState`, reading through `normalizeSelection` so
  stale/garbage localStorage can't crash the page. Chips are `aria-pressed`
  Buttons; format pills render only when ≥1 team selected. Existing nav grid
  extracted to `NavigationGrid` in index.tsx, unchanged (T7 repositions it).
  Analytics wiring deferred to T12 per task plan. Note: `npx tsc -b
  tsconfig.app.json` shows two PRE-EXISTING errors in
  pin-event-button.test.tsx / save-league-button.test.tsx (UseQueryResult
  casts) — not part of the CI gate, left untouched.
- **T4 (2026-07-19):** durations added to types.ts
  (`CRICKET_FORMAT_DURATION_MINUTES`: test 5d fallback · odi 8h · t20i/other 4h);
  past-check uses `endDate` when present (`isCricketEventPast`) so an in-progress
  Test isn't "past" mid-match. ICS: Tests emit `end` (DTSTART→DTEND) instead of
  `duration`; titles "Name — formatDetail" (suffix omitted when ESPN gives none);
  description "SeriesName: Name — status". Test factory shared via
  `testEvent.ts`. Live smoke: 52 events → valid ICS (createEvents ok, 52
  VEVENTs, multi-day DTEND verified); format filter 52→9 Tests. Also fixed a
  T3 test-helper `unknown` typing caught by `tsc -p shared` (note: the repo's
  CI gate never typechecks shared — vite build only bundles; consider adding
  tsc to CI later, out of scope here).
- **T3 (2026-07-18):** `fetch.ts` mirrors the IPL normalizer, extended with
  `format`/`formatDetail`/`seriesId`/`seriesName`/`endDate`; `seriesName` prefers the
  scoreboard response's league name over the discovery ref. Orchestration flattens
  series×day pairs into one `mapWithConcurrency` pass (no nested fan-out).
  Live smoke: 52 India matches (9 Tests / 20 ODIs / 23 T20Is) across all 10 series in
  ~3.6 s. Note: discovered series contribute their full calendars, so series
  straddling the lookahead horizon are included completely (Australia Tests run to
  Feb 2027) — treated as intended behavior. A Test's `endDate` runs to day 4/5
  23:59 as expected; an "Only Test" formatDetail exists (one-off Tests), so ICS
  titles in T4 must not assume "Nth Format" shape.
- **T2 (2026-07-18):** first implementation used the spec's 3-day sampling and the
  live smoke immediately disproved the "vanishingly rare miss" assumption — it found
  only 3 of India's series, phase-locking past the Zimbabwe tour (Jul 23/25/26) and
  the whole West Indies series (8 match days, zero sample hits). Probing for
  alternatives surfaced `dates=YYYYMM` month support and its quirks (see Reference),
  leading to the hybrid scan now implemented; specify.md's NFR-1/assumption/research
  sections updated accordingly. Redesigned live smoke finds 10 India series
  (Afghanistan, Ireland, England, Zimbabwe, Sri Lanka tours + WI/SL/ZIM/AUS home
  series + NZ tour) in ~8 s. Also: fixture is imported as JSON (not `readFileSync`)
  because the root vitest config runs jsdom where `import.meta.url` isn't `file:`;
  `resolveJsonModule` added to shared/tsconfig.json.
- **T1 (2026-07-17):** Types in `shared/src/cricketTeam/types.ts`
  (`CricketTeamEvent = IplEvent & {seriesId, seriesName, format, formatDetail,
  endDate?}` — `formatDetail` added beyond the spec sketch to carry the
  competition description, e.g. "2nd T20I", for card badges and ICS titles).
  Fixtures recorded from live ESPN responses, trimmed to consumed fields per
  repo convention: `cricket-header.json` (2026-07-25 header, 4 series incl.
  India tour of Zimbabwe and a women's competition as a negative case),
  `cricket-series-scoreboard.json` (India tour of Sri Lanka 24567, undated —
  calendar + the multi-day 1st Test with `class`/`endDate`),
  `cricket-odi-scoreboard.json` (WI tour of India 24289 dated 2026-09-27 —
  1st ODI) — the planned single "match-date incl. Test" fixture became the
  ODI one because the undated series fixture already contains the Test.
  **Quirk for T3:** a Test appears in `leagues[0].calendar` once per match
  *day* (24567: Aug 15–19 all map to the same event 1544001) and dated
  fetches on each of those days return that same event — dedupe by event id
  is mandatory, and `winner` can be the string `"false"` (IPL normalizer
  already handles this). Logo CDN pattern verified live (HTTP 200,
  `image/png`, id 6).
