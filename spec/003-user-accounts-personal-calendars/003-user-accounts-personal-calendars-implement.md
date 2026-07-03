# Implement: User Accounts & Personal Calendars

Execution log for the SPECIFY → TASKS → IMPLEMENT workflow. Tasks are defined in
`003-user-accounts-personal-calendars-tasks.md`. Work one task at a time; check it off
here and in tasks.md after the human approves the increment.

## Conventions
- Commands: CI gate = `npm run lint && npm run format:check && npm run test:run &&
  npm run build` · backend = `supabase start` / `supabase functions serve` ·
  migrations = `supabase db reset` (local).
- Client imports: named exports, `@/` alias; shared logic only from
  `@sports-calendar/shared`; league-specific behavior injected into generic base
  components (see `infinite-scroll-events.tsx` / `download-ical-button.tsx`).
- Secrets: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are the only client-side
  values. `SUPABASE_SERVICE_ROLE_KEY` lives exclusively in the Edge Function env
  (provided automatically by the Supabase runtime).

## Reference (verified during planning)
- Backend pipeline to reuse per league: `parse<League>Params`
  (`functions/_shared/params.ts`) → `fetchAll<League>Events` → `filter<League>Events`
  → `transform<League>EventsToIcs` → `createEvents` + `icsHeaders()` — see
  `registerLeagueRoute` in `functions/calendar/index.ts`. Shared transforms emit `uid`,
  which the personal feed uses for dedupe.
- `showPastEvents` is pinned `true` in all backend feeds; keep that rule for the
  personal feed (subscriptions and pins).
- No `supabase/migrations/` directory exists yet; no auth or DB is configured — T1
  creates the first migration. `config.toml` may need `[auth]` settings for local
  Google/magic-link testing.
- Recorded ESPN fixtures for function tests live in `functions/calendar/fixtures/`.
- Client has no supabase-js dependency yet; env pattern to copy: `client/lib/analytics.ts`
  no-ops when its env vars are absent, keeping dev/test green without secrets.
- OAuth redirect caveat: app is served at `https://shubhsheth.github.io/sports-calendar/`
  (Vite `base`), so Supabase redirect URLs must include the base path, and the router
  runs on that base — test the callback on both localhost and Pages.

## Progress
- [x] T1 — Database schema + RLS
- [x] T2 — Client auth foundation
- [ ] T3 — Calendar data layer (client)
- [ ] T4 — Personal feed endpoint (backend)
- [ ] T5 — League page integration
- [ ] T6 — My Calendar page
- [ ] T7 — Analytics + docs
- [ ] T8 — Full verification

## Notes
- **T1 verification (env constraint):** this environment has no Supabase CLI and no
  Docker daemon, so `supabase db reset` couldn't run here. Verified instead against a
  local PostgreSQL 16 cluster with a stubbed Supabase environment (`auth.users`,
  `auth.uid()` reading `request.jwt.claims`, `anon`/`authenticated`/`service_role`
  roles with default grants): migration applies cleanly; assertions covered RLS enabled
  on all three tables, owner CRUD, cross-user read/write denial (including a leaked
  calendar-UUID insert attempt), anon denial, service-role bypass (token lookup), the
  one-calendar-per-user / one-subscription-per-league / league-whitelist /
  pinned-uniqueness constraints, and `auth.users` delete cascade. Re-run
  `supabase db reset` locally once before deploying (T8 checklist).
- **RLS policy style:** `(select auth.uid())` per Supabase perf guidance (initPlan
  caching); policies target only `authenticated` — no anon policies by design.
