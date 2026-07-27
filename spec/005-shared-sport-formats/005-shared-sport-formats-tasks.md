# Tasks: Shared Sport Formats & Durations

Implements: `spec/005-shared-sport-formats/005-shared-sport-formats-specify.md`

Ordered so the suite stays green after every task. T1 adds the new module
alongside the old constants; T2–T7 migrate one league at a time; T8 removes the
last of the old constants once nothing reads them; T9–T10 close out.

Each task lists its acceptance check. Tick a box only when that check passes.

---

- [ ] **T1: Add the shared sports module**
  - Create `shared/src/sports/formats.ts` exporting `SPORT_FORMATS` (sport →
    format name → minutes) covering all six sports, a `Sport` type, a
    format-name type derived from the map, and a duration lookup helper with a
    documented fallback.
  - Values must match today's constants exactly: nba 150, nfl 210, fifa 120,
    ipl 240, cricket test `5*24*60` / odi 480 / t20i 240 / other 240, f1
    practice 60 / qualifying 60 / race 120 / sprintQualifying 45 / sprint 30.
  - Export an F1 session-type-id → format-name map so `"1"|"2"|"3"|"5"|"6"`
    resolve to named formats, with unknown ids falling back to 60 minutes.
  - Wire into `shared/src/index.ts`.
  - Add `shared/src/sports/formats.test.ts`: every sport/format resolves to the
    expected minutes; unknown format hits the fallback; F1 ids map correctly.
  - Covers: FR-1, FR-2, FR-3, FR-4, NFR-2
  - Verify: `npx vitest run shared/src/sports` passes; `npm run test:run` still
    green (nothing else changed yet).

- [ ] **T2: Migrate NBA**
  - `shared/src/nba/types.ts`: remove `NBA_DURATION_MINUTES`.
  - Update `shared/src/nba/filters.ts`, `shared/src/nba/transform.ts`, and
    `client/components/nba/nba-event-card.tsx` to resolve duration through the
    shared module.
  - Add a parity assertion that NBA still resolves to 150.
  - Covers: FR-5, NFR-1
  - Verify: `npx vitest run shared/src/nba client/components/nba` green; no
    remaining reference to `NBA_DURATION_MINUTES`.

- [ ] **T3: Migrate NFL**
  - Same shape as T2 for `nfl` (210).
  - Covers: FR-5, NFR-1
  - Verify: `npx vitest run shared/src/nfl client/components/nfl` green; no
    remaining reference to `NFL_DURATION_MINUTES`.

- [ ] **T4: Migrate FIFA**
  - Same shape as T2 for `fifa` (120).
  - Covers: FR-5, NFR-1
  - Verify: `npx vitest run shared/src/fifa client/components/fifa` green; no
    remaining reference to `FIFA_DURATION_MINUTES`.

- [ ] **T5: Migrate IPL**
  - Same shape as T2 for `ipl` (240).
  - Covers: FR-5, NFR-1
  - Verify: `npx vitest run shared/src/ipl client/components/ipl` green; no
    remaining reference to `IPL_DURATION_MINUTES`.

- [ ] **T6: Migrate F1**
  - Remove `F1_SESSION_DURATIONS` from `shared/src/f1/types.ts`.
  - Update `shared/src/f1/filters.ts`, `shared/src/f1/transform.ts`, and
    `client/components/f1/f1-event-card.tsx` to go through the session-id map,
    preserving the 60-minute fallback at all three sites.
  - Covers: FR-4, FR-5, NFR-1
  - Verify: `npx vitest run shared/src/f1 client/components/f1` green; each of
    the five session ids resolves to its previous duration and an unknown id
    still yields 60.

- [ ] **T7: Migrate cricket and correct live/past**
  - Remove `CRICKET_FORMAT_DURATION_MINUTES` from
    `shared/src/cricketTeam/types.ts`.
  - `shared/src/cricketTeam/filters.ts`: compute past from the format duration
    only; stop consulting `endDate`. Bring the shape in line with the other five
    leagues via the shared `isEventPast`.
  - `client/components/cricket-teams/cricket-team-event-card.tsx`: use the
    shared `isEventLive` rather than the bespoke `started && !isCricketEventPast`
    expression.
  - `shared/src/cricketTeam/transform.ts`: derive the ICS span from the format
    duration for every format, including Tests.
  - Update the docstrings in `types.ts`, `filters.ts`, and the card that
    currently describe `endDate` as authoritative and Test-only — they are
    factually wrong (100% of matches carry one, padded ~40h for a T20I).
  - Update existing tests that assert the old `endDate` precedence; add tests
    for a finished T20I (not live, is past), a match inside its window (live),
    and a match whose `endDate` precedes its start (unaffected).
  - Covers: FR-5, FR-7, FR-8, FR-9
  - Verify: `npx vitest run shared/src/cricketTeam client/components/cricket-teams`
    green; a T20I started more than 240 minutes ago is past and not live.

- [ ] **T8: Confirm full removal**
  - Grep the repo for all six removed constant names; expect zero definitions
    and zero consumers outside the spec folder.
  - Remove any import left orphaned by T2–T7.
  - Covers: FR-5, Success Criterion 5
  - Verify: `npm run test:run` green; the Deno suite green; `npm run lint` shows
    no new problems; `npm run format:check` clean.

- [ ] **T9: Verify against live data**
  - Re-run the cricket status probe used during investigation against live ESPN
    for at least two teams; confirm no match past its nominal duration reports
    as live, and that the `IND v AUS` Test with the inverted `endDate` still
    appears at its correct start.
  - Covers: Success Criteria 1, 2, 3
  - Verify: probe output shows no false LIVE rows.

- [ ] **T10: File the Test-match issue**
  - Open a GitHub issue describing why a flat five-day Test window is crude,
    what the upstream `endDate` data actually looks like (universal, padded to a
    day boundary, occasionally inverted), and what would make a better end-time
    signal trustworthy.
  - Covers: FR-10, Success Criterion 8
  - Verify: issue exists and is linked from the PR.
