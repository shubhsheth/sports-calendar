# Tasks: User Accounts & Personal Calendars

Each task ends in a compiling, testable state. Verify after each with the CI gate:
`npm run lint && npm run format:check && npm run test:run && npm run build`.
Backend tasks additionally verify against the locally served function
(`supabase start && supabase functions serve`).

- [x] **T1 — Database schema + RLS.** Add `supabase/migrations/` with one migration
  creating `calendars` (id, user_id unique → auth.users, feed_token uuid unique default
  `gen_random_uuid()`, created_at), `calendar_subscriptions` (id, calendar_id fk cascade,
  league text check in nba/nfl/f1/ipl/fifa, filters jsonb, created_at, unique
  (calendar_id, league)), and `calendar_pinned_events` (id, calendar_id fk cascade,
  league text check, espn_event_id text, created_at, unique (calendar_id, league,
  espn_event_id)). Enable RLS on all three; policies: owner (`auth.uid()` = `user_id`,
  via owning calendar for child tables) gets select/insert/update/delete; no anon access.
  Verify: `supabase db reset` applies cleanly; SQL statements assert RLS is enabled and
  a second user cannot read the first user's rows.

- [x] **T2 — Client auth foundation.** Add `@supabase/supabase-js` to the client
  workspace; `client/lib/supabase.ts` singleton from `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` (no-op guard when absent, like analytics.ts);
  `client/hooks/useAuth.tsx` exposing session/user + `signInWithGoogle`,
  `signInWithMagicLink`, `signOut` (handles the OAuth redirect under the GitHub Pages
  base path); header gets a Sign in button ↔ account menu (avatar/email + sign out).
  Update `.env.example`. Verify: CI gate green; signed-out render unchanged; manual
  smoke sign-in against local Supabase.

- [x] **T3 — Calendar data layer (client).** `client/api/calendar/` module:
  `getOrCreateCalendar()`, `upsertSubscription(league, filters)`,
  `removeSubscription(league)`, `pinEvent(league, espnEventId)` / `unpinEvent(...)`,
  `listCalendar()` (calendar + subscriptions + pinned events), `regenerateFeedToken()`.
  All via supabase-js against RLS tables; React Query hooks wrapping each. Unit tests
  with a mocked supabase client. Verify: CI gate green.

- [x] **T4 — Personal feed endpoint (backend).** In the `calendar` function: a
  service-role supabase client helper in `functions/_shared/`; `GET
  /calendar/my/:token.ics` → look up calendar by feed_token (404 if none), load
  subscriptions + pinned events, then per involved league: `fetchAll<League>Events`
  once → subscription slice = existing `filter<League>Events` with filters validated by
  the existing `parse<League>Params` shapes; pinned slice = select by event id; union →
  `transform<League>EventsToIcs` → concat leagues → dedupe by `uid` → `createEvents`
  with `icsHeaders()`. Tests against the recorded ESPN fixtures (combined output,
  dedupe, invalid/unknown token, empty calendar). Verify: deno tests + local serve
  round-trip with a seeded row.

- [x] **T5 — League page integration.** Signed-in users get: an "Add to My Calendar"
  action beside the existing feed links that saves the league with the currently
  selected filters (upsert; button reflects already-subscribed state), and a pin/unpin
  toggle on each event card (NBA/NFL/F1/IPL/FIFA). Signed-out clicks prompt sign-in.
  Follow the existing injected-function base-component pattern — one generic
  implementation, league specifics passed in. Verify: CI gate green; component tests
  for signed-in/out states.

- [ ] **T6 — My Calendar page.** `client/routes/my-calendar.tsx` (+ header nav link,
  signed-in only): lists league subscriptions with their filter pills and pinned events
  (event name/date via existing detail fetchers); remove actions for both; personal
  feed URL block reusing `add-to-calendar-feed-links.tsx` (Copy/Apple/Google) with a
  "Regenerate URL" action (confirm dialog). Empty and signed-out states. Verify: CI
  gate green; component tests for empty/populated/signed-out.

- [ ] **T7 — Analytics + docs.** Typed analytics events for sign-in/out, subscribe/
  unsubscribe league, pin/unpin, feed-URL copy, token regen (per `client/lib/analytics.ts`
  conventions). Update `docs/PROJECT_OVERVIEW.md`, `docs/BACKEND.md` (new endpoint,
  schema, RLS), `.env.example`. Verify: CI gate green.

- [ ] **T8 — Full verification.** CI gate green. Manual round trip on local stack:
  sign in (Google + magic link) → subscribe two leagues with filters + pin one event →
  My Calendar shows all → feed URL returns combined deduped ICS → remove one item →
  feed reflects it → regenerate token → old URL 404s, new one works. Anonymous smoke of
  all five league routes + per-league feeds unchanged. Checklist of deploy-time config
  (Supabase Google provider, redirect URLs for localhost + GitHub Pages, function env)
  recorded in implement.md notes.
