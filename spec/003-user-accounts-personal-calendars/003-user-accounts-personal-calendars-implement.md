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
- [x] T3 — Calendar data layer (client)
- [x] T4 — Personal feed endpoint (backend)
- [x] T5 — League page integration
- [x] T6 — My Calendar page
- [x] T7 — Analytics + docs
- [x] T8 — Full verification

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
- **T4 verification (env constraint):** same as T1 — no local `supabase functions
  serve` here. Verified with the function's Deno test harness (fixture-stubbed ESPN +
  PostgREST fetch): combine/dedupe, invalid/unknown token 404s, invalid stored filters
  skipped, empty calendar. Live round trip deferred to the T8 deploy checklist.
- **T6 simplifications (minor drift from tasks.md wording):** subscriptions display
  filter *summaries* ("2 teams selected" / F1 session names via
  `translateF1EventTypeId`) rather than full team-name pills — team names would need
  per-league team fetches for marginal value. Pinned events resolve name/date via the
  core API's per-event endpoint (`…/leagues/<league>/events/<id>`); IPL has no such
  endpoint (verified: `summary?event=` errors), so IPL pins search the cached season
  fetch (`fetchAllIplEvents` via `ensureQueryData`, shared across pins).
- **T8 verification (what ran here):** CI gate green (205 vitest tests / 0 lint
  errors / format clean / build ok), 8 Deno feed tests green, migration + RLS harness
  green on local Postgres 16. Headless-Chromium smoke against `npm run dev` in both
  modes: (a) no Supabase env — auth UI and account affordances absent everywhere,
  all five league routes + Add to Calendar + live FIFA event cards render, My
  Calendar explains accounts aren't configured, zero console errors; (b) dummy
  Supabase env, signed out — Sign in button, Save to My Calendar on all five routes,
  pin buttons on cards, pin click opens the sign-in dialog, My Calendar prompts
  sign-in, zero console errors. Signed-in round trip (real Google/magic-link login →
  save/pin → fetch `/calendar/my/<token>.ics`) requires a real Supabase project and
  is covered by the deploy checklist below.

## Deploy checklist (requires the real Supabase project — not possible in this sandbox)
1. `supabase db push` (applies `20260703000000_user_calendars.sql`); confirm RLS is
   shown enabled on all three tables in the dashboard.
2. Supabase Auth: enable the Google provider (OAuth client id/secret) and email OTP;
   add redirect URLs for both `http://localhost:5173/` and
   `https://shubhsheth.github.io/sports-calendar/` (site URL = the Pages URL).
3. Client env (GitHub Pages build + local `.env`): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` (anon key only — never the service key).
4. `supabase functions deploy calendar` (CI does this on merge); the runtime injects
   `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` automatically — no new secrets.
5. Manual round trip: sign in with Google AND a magic link → save two leagues with
   filters + pin one event → My Calendar lists all three → feed URL returns the
   combined deduped ICS in a calendar app → remove one item → feed reflects it →
   regenerate token → old URL 404s, new URL works.
