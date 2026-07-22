# Calendar Feed Backend

The backend is a single **Supabase Edge Function** (`calendar`) that serves live,
auto-updating iCalendar (`.ics`) **subscription feeds**. Unlike the client's
one-time `.ics` download, a subscribed calendar is re-fetched periodically by the
user's calendar app, so new fixtures and updated times appear automatically.

It runs on **Deno** and is built with **[Hono](https://hono.dev/)**. All
league-specific logic (ESPN fetching, filtering, ICS transform) is imported from
the `@sports-calendar/shared` workspace, so the feeds and the website stay in
sync.

## Architecture

```
supabase/
├── config.toml                       # Supabase CLI / local dev config
├── migrations/                       # Postgres schema (personal calendars, RLS)
└── functions/
    ├── deno.json                     # Deno import map (hono, ics, @sports-calendar/shared, …)
    ├── _shared/
    │   ├── params.ts                 # Query-param parsing/validation per league
    │   ├── icsHeaders.ts             # Response headers for .ics feeds
    │   └── personalCalendar.ts       # Service-role calendar lookup by feed token
    └── calendar/
        ├── index.ts                  # Hono app + one route per league + personal feed
        ├── personalFeed.ts           # Combined subscription/pin pipeline
        └── fixtures/                 # Recorded ESPN responses for tests
```

Every league route runs the same pipeline (`registerLeagueRoute` in
`calendar/index.ts`):

```
parse query params → fetch all events from ESPN → filter → transform to ICS
→ createEvents() (ics) → respond with icsHeaders()
```

The only per-league differences are the four functions wired in, all from
`@sports-calendar/shared`: `fetchAll<League>Events`, `filter<League>Events`,
`transform<League>EventsToIcs`, and the matching `parse<League>Params`.

## Endpoints

| Route | Query params |
|-------|--------------|
| `GET /calendar/nba.ics` | `teamIds` |
| `GET /calendar/nfl.ics` | `teamIds` |
| `GET /calendar/ipl.ics` | `teamIds` |
| `GET /calendar/fifa.ics` | `teamIds` |
| `GET /calendar/f1.ics` | `types` |
| `GET /calendar/cricket-team/<teamId>.ics` | `formats` (`test,odi,t20i,other`) |
| `GET /calendar/my/<feed_token>.ics` | — (personal combined feed) |

The cricket-team route follows a national side across every series it plays
(`teamId` must be one of the curated sides in
`shared/src/cricketTeam/types.ts`; anything else is rejected). Each request
re-runs ESPN series discovery, so newly announced tours appear in subscribed
calendars without user action — see the cricket section of
[`ESPN_API.md`](ESPN_API.md).

Params mirror the website's filters and are parsed/validated in
`supabase/functions/_shared/params.ts` — comma-separated ID lists, F1 session-type
validation, and the "always include past events" rule are documented there.
Responses are `text/calendar` with a one-hour cache and open CORS; the exact
headers are in `_shared/icsHeaders.ts`.

## Personal combined feed

`GET /calendar/my/<feed_token>.ics` serves a signed-in user's personal calendar:
the union of each saved league subscription (that subscription's stored filters
applied) and every individually pinned event, deduplicated by ICS UID. The
token is the calendar's secret `feed_token` (a UUID — anything else 404s
without a database lookup, and tokens can be regenerated from the My Calendar
page).

Data lives in Postgres (`supabase/migrations/`): `calendars` (one per user,
`user_id → auth.users`, unique `feed_token`), `calendar_subscriptions` (one
row per league — except `cricket-team`, one row per followed team — with
filters as JSONB in the same shape as the query params above), and
`calendar_pinned_events` (`league` + `espn_event_id`). Subscription uniqueness
is `(calendar_id, league, team_key)`, where `team_key` is a stored generated
column mirroring `filters->>'teamId'` (empty for leagues) so PostgREST upserts
can target it. Cricket pins store `espn_event_id` as `"{seriesId}:{eventId}"`,
letting the feed resolve them from that one series without a discovery scan.
All three tables are RLS-protected owner-only; the feed route reads them via
PostgREST with the service-role key (`_shared/personalCalendar.ts` —
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the Edge
Function runtime). Stored filters are re-validated at feed time with the same
`parse<League>Params` parsers; a subscription that fails validation is
skipped, never a 500.

## Feed URL shape

The client builds each subscription URL as `<base>/<league>.ics` from
`VITE_CALENDAR_FEED_BASE_URL` (`client/lib/buildCalendarFeedUrl.ts`), appending
active filters as a query string, e.g. `<base>/nba.ics?teamIds=10,14`. The base
points at the deployed `calendar` function (Hono routes under `/calendar/*`); see
`.env.example` for the exact form.

## Local development

```bash
supabase start             # start the local Supabase stack
supabase functions serve   # serve the Edge Functions locally (watch mode)
```

Point `VITE_CALENDAR_FEED_BASE_URL` at the locally served `calendar` function to
test feeds end to end.

## Deployment

```bash
supabase functions deploy calendar
```

Automated in CI by `.github/workflows/deploy-functions.yml`, which deploys when
`supabase/functions/**` or `shared/**` changes.
