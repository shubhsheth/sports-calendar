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
└── functions/
    ├── deno.json                     # Deno import map (hono, ics, @sports-calendar/shared, …)
    ├── _shared/
    │   ├── params.ts                 # Query-param parsing/validation per league
    │   └── icsHeaders.ts             # Response headers for .ics feeds
    └── calendar/
        ├── index.ts                  # Hono app + one route per league
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

Params mirror the website's filters and are parsed/validated in
`supabase/functions/_shared/params.ts` — comma-separated ID lists, F1 session-type
validation, and the "always include past events" rule are documented there.
Responses are `text/calendar` with a one-hour cache and open CORS; the exact
headers are in `_shared/icsHeaders.ts`.

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
