# Calendar Feed Backend

The backend is a single **Supabase Edge Function** (`calendar`) that serves live,
auto-updating iCalendar (`.ics`) **subscription feeds**. Unlike the client's
one-time `.ics` download, a subscribed calendar is re-fetched periodically by the
user's calendar app, so new fixtures and updated times appear automatically.

It runs on **Deno** and is built with **[Hono](https://hono.dev/)**. All
league-specific logic (ESPN fetching, filtering, ICS transform) is imported from
the `@sports-calendar/shared` workspace, so the feeds and the website stay in
sync.

---

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

The request pipeline in `calendar/index.ts` is identical for every league
(`registerLeagueRoute`):

```
parse query params → fetch all events from ESPN → filter → transform to ICS
→ createEvents() (ics) → respond with icsHeaders()
```

The only per-league differences are the four functions wired in, all from
`@sports-calendar/shared`: `fetchAll<League>Events`, `filter<League>Events`,
`transform<League>EventsToIcs`, and the matching `parse<League>Params`.

---

## Endpoints

| Route | Query params |
|-------|--------------|
| `GET /calendar/nba.ics` | `teamIds` |
| `GET /calendar/nfl.ics` | `teamIds` |
| `GET /calendar/ipl.ics` | `teamIds` |
| `GET /calendar/fifa.ics` | `teamIds` |
| `GET /calendar/f1.ics`  | `types` |

Notes:
- `teamIds` and `types` are comma-separated ID lists (e.g. `teamIds=10,14`). Absent or empty ⇒ **no filter** (all teams / all sessions).
- F1 `types` are session type IDs; valid values are `1,2,3,5,6`. F1 rejects unknown
  IDs with HTTP `400` — `1` Practice, `2` Qualifying, `3` Race, `5` Sprint Qualifying,
  `6` Sprint Race.
- Feeds **always include past events** so a subscribed calendar keeps the full
  season's history. The `showPastEvents` filter is pinned to `true` server-side
  and any `showPastEvents` query param is ignored.

### Response headers (`_shared/icsHeaders.ts`)

```
Content-Type: text/calendar; charset=utf-8
Cache-Control: public, max-age=3600
Access-Control-Allow-Origin: *
```

`max-age=3600` asks calendar clients to cache the feed for an hour. CORS is also
enabled app-wide via Hono's `cors()` middleware so browser-based calendar tools
can fetch the feed.

---

## Feed URL shape

The client builds each subscription URL as `<base>/<league>.ics`, where `<base>`
is `VITE_CALENDAR_FEED_BASE_URL` and `<league>` is one of `nba`, `nfl`, `f1`,
`ipl`, `fifa` (`client/lib/buildCalendarFeedUrl.ts`). Active filters are appended
as a query string. For example:

```
<base>/nba.ics?teamIds=10,14
```

`VITE_CALENDAR_FEED_BASE_URL` points at the deployed Edge Function, whose Hono
routes are served under `/calendar/*` (`supabase/functions/calendar/index.ts`).
See `.env.example` for the exact base-URL form.

---

## Local development

```bash
supabase start             # start the local Supabase stack
supabase functions serve   # serve the Edge Functions locally (watch mode)
```

The function is then reachable at
`http://localhost:54321/functions/v1/calendar/calendar/<league>.ics`.

## Deployment

```bash
supabase functions deploy calendar
```

This is automated in CI by `.github/workflows/deploy-functions.yml`, which
deploys when `supabase/functions/**` or `shared/**` changes.
