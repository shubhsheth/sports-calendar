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
- [x] T5 — Home selection state + filters
- [x] T6 — Combined schedule data layer
- [x] T7 — Merged schedule UI + calendar links
- [ ] T8 — Backend team feed
- [ ] T9 — Subscription schema migration + client types
- [ ] T10 — Personal feed backend branch
- [ ] T11 — Client My Calendar integration
- [ ] T12 — Analytics
- [ ] T13 — Update documentation
- [ ] T14 — Full verification

## Notes
- **UX pivot (2026-07-17, after T1):** the picker page + dedicated team page were
  replaced by Teams + Leagues multi-select filters on the home page populating one
  merged chronological schedule (league pages unchanged; teams filter = the 12
  cricket sides). Cascaded through specify.md (Objective, stories, FR-1..4/6,
  NFR-2a, Assumptions, Project Structure, Success Criteria) and tasks.md (T5–T7
  replaced; T11/T12/T14 retargeted). Shared layer T2–T4 unaffected. Home layout:
  filters on top; no selection → today's grid, no fetches; selection → calendar-links
  panel + merged schedule, grid moves below. Selection persists via
  `useLocalStorageState`.
- **T7 (2026-07-19):** ref-based league cards (nba/nfl/f1/fifa) gained an
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
