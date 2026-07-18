# Implement: Migrate Platform from Supabase to Firebase

Execution log for the SPECIFY → TASKS → IMPLEMENT workflow. Tasks are defined in
`005-firebase-migration-tasks.md`. Work one task at a time; check it off here
and in tasks.md after the human approves the increment.

## Conventions
- CI gate = `npm run lint && npm run format:check && npm run test:run && npm run build`.
- Emulators: `npx firebase emulators:start` (dev) /
  `npx firebase emulators:exec "<cmd>"` (tests). No real Firebase project is
  needed until the deploy checklist.
- Client imports: named exports, `@/` alias; shared ESPN logic only from
  `@sports-calendar/shared`; keep `calendarApi.ts` and `useAuth` signatures
  frozen so hooks/UI don't churn.
- The two stacks coexist until T7; the app must build and pass tests at every
  task boundary with Supabase still wired wherever Firebase hasn't replaced it
  yet.

## Reference (verified during planning — see spec 005 research, 2026-07-05)
- Audit: auth surface = `client/lib/supabase.ts`, `auth-provider.tsx`,
  `useAuth.ts` type, `calendarApi.ts#requireUserId`, 2 test files. All DB
  access in `calendarApi.ts`. Backend Deno-specific surface: `Deno.serve` line,
  `Deno.env` in `personalCalendar.ts` (full rewrite), deno.json import map;
  Hono/params/personalFeed/icsHeaders are pure TS. Deno tests: `index.test.ts`,
  `my-feed.test.ts`, `_shared/params.test.ts` + `calendar/fixtures/`.
- **Teams dimension (spec-004 cricket-team, merged after this spec was drafted).**
  Migration `20260719000000_cricket_team_subscriptions.sql`: league whitelist is
  now 6 values incl. `cricket-team`; subscription uniqueness moved to
  `(calendar_id, league, team_key)` where `team_key` is a stored generated column
  = `coalesce(filters->>'teamId','')`; a CHECK requires cricket-team rows to have
  `filters->>'teamId'`. So the Firestore subscription doc ID is `league` for the
  single-instance leagues and `cricket-team__<teamId>` for a followed team
  (`team_key` empty → league-only id preserves one-per-league). `calendarApi.ts`
  now takes `removeSubscription(league, teamId?)` and upserts on
  `calendar_id,league,team_key`. Backend adds `/calendar/cricket-team/:file`
  (`<teamId>.ics`, numeric gate, series-discovery fetch — no fixed season) and a
  cricket-team slice in `personalFeed.ts`; cricket **pins** store
  `"<seriesId>:<eventId>"` (not a bare id). Shared code: `shared/src/cricketTeam/*`
  (discovery/fetch/filters/transform/types) + `parseCricketTeamParams`. New
  fixtures `cricket-header.json`, `cricket-series-scoreboard.json`. All of it is
  pure TS and ports the same way; the esbuild bundle must include the cricketTeam
  module + discovery.
- Two client deletes (`removeSubscription`, `unpinEvent`) currently rely on RLS
  for user scoping — the Firestore rewrite MUST address exact doc paths under
  `calendars/{uid}`; this is the highest-risk correctness point of the port.
  (The team-aware `removeSubscription` deleting an exact subscription doc is
  actually cleaner in Firestore than the Postgres `.eq("team_key", …)` filter.)
- Firestore doc-ID model gives every Postgres unique constraint for free:
  `calendars/{uid}`, `subscriptions/{league | cricket-team__<teamId>}`,
  `pinnedEvents/{league}_{eventId}` (cricket pin ids contain a colon —
  `cricket-team_<seriesId>:<eventId>` — which is a legal Firestore doc-ID char).
  Feed-token lookup is a single-field auto-indexed query (Admin SDK bypasses
  rules). No composite indexes needed in this spec.
- Email-link auth needs a completion path on app load
  (`isSignInWithEmailLink(window.location.href)`) — a genuinely new code path
  vs supabase-js's automatic URL-session detection.
- Firestore emulator requires a JVM; check `java -version` in the sandbox at T1
  and record the fallback (rules-unit-testing still needs the emulator — if no
  JVM, install a JRE or scope rules verification to the deploy checklist).
- Hosting rewrites: order matters (`/calendar/**` before the SPA `**` rewrite);
  Hosting imposes a hard 60s timeout on rewritten function calls; CDN caches
  per URL+query only for GET/HEAD when `s-maxage` is set; deploys purge the CDN.
- Costs: free allowances persist on Blaze; expected ~$0-1/mo for this spec
  (no sync jobs yet).

## Progress
- [ ] T1 — Firebase scaffolding + emulators
- [ ] T2 — Functions workspace (pure port)
- [ ] T3 — Firestore rules + data layer
- [ ] T4 — Client auth swap
- [ ] T5 — Hosting cutover in the client
- [ ] T6 — CI/CD rewrite
- [ ] T7 — Decommission Supabase
- [ ] T8 — Full verification

## Notes
(populated during implementation — spec drift, environment constraints, deploy
checklist lands here at T8)
