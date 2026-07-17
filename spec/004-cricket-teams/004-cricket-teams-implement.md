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
  `https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&dates=YYYYMMDD`
  → `sports[0].leagues[]` = every series with a match that date; each league has
  `id`, `name`, `isTournament`, `events[]` with `competitors[] {id, displayName}`.
  Date ranges (`dates=A-B`) return empty — per-date only. Responses are gzipped
  (irrelevant to `fetch`, but curl needs `--compressed`).
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
- [ ] T2 — Series discovery
- [ ] T3 — Team event fetch + normalization
- [ ] T4 — Filters + ICS transform
- [ ] T5 — Team picker page
- [ ] T6 — Team schedule page
- [ ] T7 — Download + feed links
- [ ] T8 — Backend team feed
- [ ] T9 — Subscription schema migration + client types
- [ ] T10 — Personal feed backend branch
- [ ] T11 — Client My Calendar integration
- [ ] T12 — Analytics
- [ ] T13 — Update documentation
- [ ] T14 — Full verification

## Notes
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
