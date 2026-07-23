# Backend: Feeds, Data, and Auth

The backend runs on **Firebase**:

- **Cloud Functions** (`calendar`) — a single 2nd-gen HTTP function that serves
  live, auto-updating iCalendar (`.ics`) **subscription feeds**. Unlike the
  client's one-time `.ics` download, a subscribed calendar is re-fetched
  periodically by the user's calendar app, so new fixtures and updated times
  appear automatically.
- **Cloud Firestore** — stores each signed-in user's personal calendar.
- **Firebase Auth** — Google + email-link sign-in.
- **Firebase Hosting** — serves the SPA and rewrites `/calendar/**` to the
  function, so feeds share the site's origin and are CDN-cached.

The function is built with **[Hono](https://hono.dev/)** on Node. All
league-specific logic (ESPN fetching, filtering, ICS transform) is imported from
the `@sports-calendar/shared` workspace, so the feeds and the website stay in
sync.

## Architecture

```
firebase.json                    # Hosting rewrites, functions, firestore, emulators
firestore.rules                  # Owner-only security rules
firestore.indexes.json           # Composite indexes (none needed yet)
functions/                       # Cloud Functions workspace (Node 22)
├── esbuild.mjs                  # Bundles src → lib/index.js (shared/hono/ics inlined)
├── package.json                 # deps: firebase-admin, firebase-functions (externals)
└── src/
    ├── index.ts                 # onRequest entry wrapping the Hono app
    ├── app.ts                   # Hono app: one route per league + cricket-team + personal feed
    ├── params.ts                # Query-param parsing/validation per league
    ├── icsHeaders.ts            # Response headers for .ics feeds (CDN cache)
    ├── personalCalendar.ts      # Firestore calendar lookup by feed token (Admin SDK)
    ├── personalFeed.ts          # Combined subscription/pin pipeline
    └── fixtures/                # Recorded ESPN responses for tests
```

Every league route runs the same pipeline (`registerLeagueRoute` in
`functions/src/app.ts`):

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
`functions/src/params.ts` — comma-separated ID lists, F1 session-type
validation, and the "always include past events" rule are documented there.
Responses are `text/calendar` with `Cache-Control: public, max-age=300,
s-maxage=3600` (the Hosting CDN holds each feed for an hour, so calendar-app
polls mostly miss the function) and open CORS; see `src/icsHeaders.ts`.

## Personal combined feed

`GET /calendar/my/<feed_token>.ics` serves a signed-in user's personal calendar:
the union of each saved league subscription (that subscription's stored filters
applied) and every individually pinned event, deduplicated by ICS UID. The
token is the calendar's secret `feedToken` (a UUID — anything else 404s without
a database lookup, and tokens can be regenerated from the My Calendar page).

### Firestore data model

```
calendars/{uid}                                   { feedToken, createdAt }
calendars/{uid}/subscriptions/{subKey}            { league, filters }
calendars/{uid}/pinnedEvents/{league}_{espnEventId}  { league, espnEventId }
```

Document IDs carry the uniqueness constraints:

- `calendars/{uid}` — the auth uid as the doc id gives one calendar per user.
- `subscriptions/{subKey}` — `subKey` is the bare `league` for the
  single-instance leagues, or `cricket-team__<teamId>` for a followed cricket
  team (so a calendar holds one row per league but one row per followed team).
  `filters` is a map in the same shape as the query params above.
- `pinnedEvents/{league}_{espnEventId}` — one pin per (league, event). Cricket
  pins store `espnEventId` as `"<seriesId>:<eventId>"`, letting the feed resolve
  them from that one series without a discovery scan.

`firestore.rules` makes every path **owner-only** (`calendars/{uid}` readable
and writable only when `request.auth.uid == uid`), with write-time validation
of the league whitelist and the cricket-team `teamId` requirement; anonymous
clients get nothing. The feed function reads calendars with the **Admin SDK**
(`functions/src/personalCalendar.ts`), which bypasses rules — no service key is
needed; the runtime provides Admin credentials. Stored
filters are re-validated at feed time with the same `parse<League>Params`
parsers; a subscription that fails validation is skipped, never a 500.

Client reads/writes go through `firebase/firestore` directly
(`client/api/calendar/calendarApi.ts`), scoped by the rules — no bespoke CRUD
API.

## Feed URL shape

The client builds each subscription URL as `<base>/<league>.ics`
(`client/lib/buildCalendarFeedUrl.ts`), appending active filters as a query
string, e.g. `<base>/nba.ics?teamIds=10,14`. `<base>` defaults to the site's own
origin + `/calendar` (Hosting rewrites `/calendar/**` to the function);
`VITE_CALENDAR_FEED_BASE_URL` overrides it.

## Local development

```bash
npm run dev                        # Vite dev server (client)
npm run build --workspace functions  # bundle the function → functions/lib
npx firebase emulators:start       # auth, firestore, functions, hosting emulators
```

With the emulators running, point the app at them (or use the Firebase
emulator UI at the configured port) to exercise sign-in, Firestore writes, and
feeds end to end.

Security-rules tests run against the Firestore emulator:

```bash
npm run test:rules
```

## Deployment

CI deploys on push to `main` (`.github/workflows/deploy.yml`):

```bash
firebase deploy --only hosting,functions,firestore
```

The deploy step activates once the `FIREBASE_PROJECT_ID` repository variable and
`FIREBASE_SERVICE_ACCOUNT` secret are set (see the deploy checklist in
`spec/005-firebase-migration/005-firebase-migration-implement.md`). Pull
requests get a Firebase Hosting preview channel
(`.github/workflows/preview.yml`).
