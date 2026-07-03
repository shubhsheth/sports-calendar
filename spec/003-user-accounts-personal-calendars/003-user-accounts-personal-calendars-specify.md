# Spec: User Accounts & Personal Calendars

## Objective

Let users create an account, build one personal calendar, and subscribe to it from any
calendar app. Today the app is anonymous: users browse per-league schedules and subscribe
to per-league filtered feeds. This feature adds the first stateful layer: a signed-in user
can (a) add filtered league subscriptions (e.g. "NBA: Lakers + Celtics", "F1: Race +
Qualifying") and (b) pin individual fixtures from the listings (a single game/session) to
their calendar. A single secret feed URL serves the combined, always-current ICS of
everything they've added.

The anonymous experience is untouched — accounts are purely additive.

## User Stories

- As a fan of several leagues, I want one calendar subscription that combines all my
  filtered leagues so that I don't manage five separate feed URLs.
- As a casual fan, I want to pin just the marquee games I care about (not a whole team's
  season) so that my calendar isn't flooded.
- As a returning user, I want to sign in with Google (or an email magic link) and see my
  saved calendar so that I can adjust subscriptions without rebuilding filters.
- As an existing anonymous user, I want everything that works today to keep working
  without an account.

## Functional Requirements

- FR-1: Users can sign in with Google OAuth or an email magic link (Supabase Auth), and
  sign out. Sessions persist across page reloads.
- FR-2: Each signed-in user has exactly one personal calendar, created automatically the
  first time they add something to it.
- FR-3: From a league page, a signed-in user can add that league to their calendar with
  the currently selected filters (team IDs for NBA/NFL/IPL/FIFA, session types for F1).
  Re-adding the same league updates the stored filters (one subscription per league).
- FR-4: From a league page, a signed-in user can pin an individual event (a specific
  game/session) to their calendar, and unpin it, directly from the event card.
- FR-5: A "My Calendar" page lists the user's league subscriptions (with their filters)
  and pinned events, and allows removing either. It shows the personal feed URL with the
  same Copy / Apple / Google affordances as the existing per-league feed links.
- FR-6: The personal feed URL (`…/calendar/my/<token>.ics`) returns a single ICS
  combining: every subscribed league's events (with that subscription's filters applied)
  plus every pinned event, deduplicated (a pinned event that also matches a subscription
  appears once).
- FR-7: The feed URL contains an unguessable secret token, not the user ID. The user can
  regenerate the token from the My Calendar page (invalidating the old URL).
- FR-8: All existing anonymous flows (browse, filter, one-time `.ics` download,
  per-league feed subscription) work unchanged, signed in or out.

## Non-Functional Requirements

- NFR-1: Row Level Security on every user-data table — a user can only read/write rows
  belonging to their own calendar. The feed endpoint reads by token via the service role.
- NFR-2: Feed tokens have at least 128 bits of entropy (UUID v4 or equivalent).
- NFR-3: The personal feed responds within the same order of magnitude as existing
  per-league feeds (each involved league is fetched from ESPN once per request, reusing
  `fetchAll<League>Events`; same 1-hour cache headers).
- NFR-4: The client bundle contains only the Supabase URL and anon key (safe to expose);
  the service-role key exists only in the Edge Function environment.

## Out of Scope

- Custom user-created events (arbitrary title/date entries) — future feature.
- Multiple named calendars per user — one calendar per user for now.
- Sharing calendars between users, or any social features.
- Email notifications, reminders, or digest emails.
- Migrating/importing a user's existing per-league feed subscriptions into the account.
- Account management beyond sign-in/sign-out (no profile editing, deletion UI, etc.).
- Password-based auth.

## Assumptions

- Supabase Postgres (same project as the existing Edge Function) stores user data;
  client CRUD goes through `supabase-js` + RLS directly — no bespoke REST API for CRUD.
- Pinned events are stored as `(league, espn_event_id)`; the feed resolves them by
  fetching that league's season (already done for subscriptions) and selecting by ID.
  No event payloads are stored — ESPN stays the source of truth.
- Subscription filters are stored as JSONB mirroring the existing query-param shapes
  (`{ "teamIds": [...] }` / `{ "types": [...] }`) and validated with the existing
  parsers in `supabase/functions/_shared/params.ts` at feed time.
- Feeds always include past events (existing backend rule, pinned events included).
- OAuth redirect must work on GitHub Pages under the `/sports-calendar/` base path and
  on localhost — Supabase Auth redirect URLs configured for both.
- Sign-in UI lives in the header; an unauthenticated user clicking "add/pin" is prompted
  to sign in.

## Tech Stack

Existing stack unchanged (React 19, TS 5.9, Vite 7, TanStack Router/Query, Tailwind 4 +
shadcn/ui, Hono on Deno, `ics`). Additions:

- `@supabase/supabase-js` v2 (client workspace) — auth + Postgres CRUD
- Supabase Postgres + Auth (Google provider, magic link) + RLS
- SQL migrations under `supabase/migrations/`

## Commands

```
Dev (client):        npm run dev
Build:               npm run build
Test:                npm run test:run
Lint:                npm run lint
Format check:        npm run format:check
Local Supabase:      supabase start && supabase functions serve
Apply migrations:    supabase db reset   (local)  /  supabase db push  (remote)
Deploy function:     supabase functions deploy calendar
```

## Project Structure

```
supabase/migrations/                  → SQL migrations (tables + RLS policies)
supabase/functions/calendar/index.ts  → + GET /calendar/my/:token.ics route
supabase/functions/_shared/           → + supabase service-role client helper
client/lib/supabase.ts                → supabase-js client singleton
client/hooks/useAuth.ts(x)            → session state + sign-in/out helpers
client/api/calendar/                  → personal-calendar CRUD (get-or-create,
                                        subscriptions, pinned events, token regen)
client/components/auth/               → sign-in button / account menu (header)
client/components/my-calendar/        → subscription list, pinned list, feed links
client/routes/my-calendar.tsx         → My Calendar page
client/components/base/               → pin button; "Add league to My Calendar"
spec/003-user-accounts-personal-calendars/ → this spec
```

Tests colocated (`*.test.ts(x)`) as elsewhere in the repo.

### Data model

```
calendars            id uuid pk · user_id uuid unique → auth.users · feed_token uuid unique
calendar_subscriptions  id · calendar_id fk · league text · filters jsonb
                        unique (calendar_id, league)
calendar_pinned_events  id · calendar_id fk · league text · espn_event_id text
                        unique (calendar_id, league, espn_event_id)
```

RLS: all three tables `user_id = auth.uid()` (via the owning calendar for child tables).

## Code Style

Match the repo: named exports, `@/` client path alias, shared logic imported from
`@sports-calendar/shared`, generic base components taking injected league functions.
Example — the feed route reuses the existing per-league pipeline functions:

```ts
// supabase/functions/calendar/index.ts
app.get("/calendar/my/:token.ics", async c => {
  const calendar = await getCalendarByToken(c.req.param("token")); // service role
  if (!calendar) return c.text("Not Found", 404);

  const icsEvents = await buildCombinedIcsEvents(calendar); // per-league fetch → filter/pin → transform → dedupe by uid
  const result = createEvents(icsEvents);
  if (!result.value) return c.text("Failed to generate calendar", 500);
  return new Response(result.value, { headers: icsHeaders() });
});
```

## Testing Strategy

- Vitest as today; tests colocated with sources.
- Pure logic (combine/dedupe pipeline, filter-JSONB validation, feed-URL builder) gets
  unit tests; the combine pipeline is tested against the recorded ESPN fixtures already
  used by the calendar function tests.
- Client CRUD/auth modules tested with a mocked `supabase-js` client (msw is already a
  dev dependency for HTTP-level mocks where simpler).
- UI: component tests for the My Calendar page states (empty, populated, signed-out).
- Manual smoke: full round trip — sign in → subscribe league + pin event → open feed URL
  → verify combined ICS in a calendar app.

## Boundaries

- **Always:** run `npm run lint`, `npm run format:check`, `npm run test:run`,
  `npm run build` before commits; keep RLS enabled on every new table; validate feed
  tokens server-side; keep anonymous flows untouched.
- **Ask first:** schema changes beyond the three tables above; new dependencies beyond
  `@supabase/supabase-js`; changes to existing per-league feed endpoints; any change to
  CI workflows or Supabase project config beyond adding env vars/redirect URLs.
- **Never:** commit service-role keys or any secret; put the service-role key in client
  code; remove or weaken existing tests; break existing per-league feed URLs.

## Success Criteria

- A new user can sign in with Google or a magic link and stays signed in after reload.
- Signed in, adding "NBA filtered to two teams" + "F1 races only" + one pinned IPL match
  produces a My Calendar page listing all three, and its feed URL returns valid ICS
  containing exactly: both NBA teams' games, F1 races, and that one IPL match — with no
  duplicate UIDs.
- Removing a subscription or pinned event updates the feed on next fetch.
- Regenerating the token makes the old URL return 404 and the new one work.
- A different user's token/URL can never expose another user's calendar; direct table
  access with the anon key cannot read another user's rows (RLS verified by test).
- Signed out, every existing page, download, and per-league feed behaves exactly as
  before (existing tests all green).
- `npm run test:run`, `npm run build`, `npm run lint`, `npm run format:check` pass.

## Open Questions

None — direction confirmed 2026-07-03 (single-game pinning + custom events deferred;
Supabase Auth with Google + magic link; one calendar per user; anonymous experience kept).
