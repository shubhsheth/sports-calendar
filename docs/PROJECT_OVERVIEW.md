# Sports Calendar — Project Overview

## Main Goal

A React SPA that fetches sports schedules from the **ESPN APIs**, displaying them with infinite scroll and event filtering. Fixtures can be exported as an `.ics` file for import into any calendar app, or followed as a **live, auto-updating subscription feed** served by a Supabase Edge Function backend. Signed-in users (Supabase Auth) get a **personal calendar**: filtered league subscriptions plus individually pinned games, combined into one secret-token feed URL.

Beyond leagues, the app has a **teams dimension** for cricket: the home page is a segmented Leagues | Teams tile selector, and each of the 12 ICC full-member sides gets a `/cricket-teams/{teamId}` page aggregating its matches across every tour and tournament (ESPN has no cricket team-schedule endpoint — see `docs/ESPN_API.md` for the series-discovery pipeline), with format filters, `.ics` download, a live feed, and My Calendar integration.

This is an npm-workspaces monorepo: a `client/` SPA (deployed to GitHub Pages), a `shared/` package of ESPN/league logic reused by both surfaces, and a `supabase/` Edge Function that serves the subscription feeds.

Deployed at: https://shubhsheth.github.io/sports-calendar/

---

## Technologies

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces (`client`, `shared`) |
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Routing | @tanstack/react-router (file-based) |
| Data Fetching | @tanstack/react-query 5.90 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix Nova) |
| Icons | Lucide React |
| Date Handling | dayjs |
| Calendar Export | `ics` v3.8 + `js-file-download` |
| Infinite Scroll | `react-intersection-observer` |
| Analytics | PostHog (`posthog-js`) |
| Backend | Supabase Edge Function — Hono on Deno |
| Auth & User Data | Supabase Auth (Google + magic link) + Postgres with RLS, via `@supabase/supabase-js` |
| Deployment | GitHub Pages (client) + Supabase (function), via GitHub Actions |

---

## Documentation

| File | Description |
|------|-------------|
| `docs/ESPN_API.md` | ESPN Core/Site API reference — endpoints, `$ref` pattern, per-league event structures, fetch pipeline, ICS mapping, and candidate leagues for expansion |
| `docs/BACKEND.md` | Supabase Edge Function — calendar feed endpoints, params, headers, local dev, and deploy |

---

## Directory Structure

```
docs/
├── PROJECT_OVERVIEW.md          # This file
├── ESPN_API.md                  # ESPN Core/Site API reference
└── BACKEND.md                   # Supabase calendar feed function
.env.example                     # Environment variables (PostHog key/host, calendar feed base URL)

shared/                          # @sports-calendar/shared — logic reused by client + backend
└── src/
    ├── espn/
    │   ├── fetchEventRefs.ts    # Paginated event references from ESPN
    │   ├── fetchEventDetails.ts # Full event details by ref URL (defines BaseEvent)
    │   └── mapWithConcurrency.ts# Concurrency-capped async map (max N in flight)
    ├── eventStatus.ts           # isEventLive() / isEventPast() helpers
    ├── sports/formats.ts        # SPORT_FORMATS + getDurationMinutes (by sport, not league)
    ├── nba/ nfl/ f1/ ipl/ fifa/ # Per-league modules, each with:
    │   ├── types.ts             #   league event/team/filter types
    │   ├── filters.ts           #   filter<League>Events
    │   ├── fetch.ts             #   fetchAll<League>Events (full-season fetch)
    │   ├── transform.ts         #   transform<League>EventsToIcs
    │   └── sessions.ts          #   (f1 only) ESPN session id → format → duration
    ├── cricketTeam/             # Cricket teams dimension (cross-series)
    │   ├── types.ts             #   event/filter types, CRICKET_NATIONAL_TEAMS
    │   ├── discovery.ts         #   discoverTeamSeriesIds (header-endpoint scan)
    │   ├── fetch.ts             #   fetchAllCricketTeamEvents (series calendars → days)
    │   ├── filters.ts           #   format filter + nominal-duration past check
    │   └── transform.ts         #   ICS transform (Tests → 5 daily events; else one span)
    └── index.ts                 # Barrel re-exporting everything above

client/                          # @sports-calendar/client — the React SPA
├── api/espn/
│   └── fetchTeamDetails.ts      # Team info by ref URL (NBA/NFL)
├── api/calendar/                # Personal calendar CRUD via supabase-js (RLS)
│   ├── calendarApi.ts           # get-or-create, subscriptions, pins, token regen
│   ├── fetchPinnedEventDetails.ts # Name/date for pinned events (core API / IPL season)
│   └── types.ts                 # League, SubscriptionFilters, MyCalendar shapes
├── lib/
│   ├── analytics.ts             # PostHog init + typed event tracking helpers
│   ├── buildCalendarFeedUrl.ts  # Builds subscription feed URLs from VITE_CALENDAR_FEED_BASE_URL
│   ├── supabase.ts              # supabase-js singleton (null without env vars)
│   └── utils.ts                 # cn() class merging utility
├── hooks/
│   ├── useAuth.ts               # Auth context + hook (provider in components/auth)
│   └── useMyCalendar.ts         # React Query hooks over api/calendar
├── components/
│   ├── auth/                    # AuthProvider, header AuthMenu, SignInDialog
│   ├── my-calendar/             # My Calendar page: lists, pinned items, feed card
│   ├── base/
│   │   ├── infinite-scroll-events.tsx     # Generic infinite scroll (accepts league prop)
│   │   ├── download-ical-button.tsx       # Generic ICS export with concurrency control
│   │   ├── add-to-calendar-feed-links.tsx # Copy/Apple/Google subscription links
│   │   ├── save-league-button.tsx         # Save league + filters to My Calendar
│   │   ├── pin-event-button.tsx           # Pin/unpin one fixture on My Calendar
│   │   └── filter-pill.tsx
│   ├── nba/ nfl/ f1/ ipl/ fifa/ # Per-league UI + utils/, e.g. nba/:
│   │   ├── nba-event-card.tsx
│   │   ├── nba-filter-selector.tsx
│   │   ├── nba-filter-pills.tsx
│   │   └── utils/               # client-side glue: fetchNbaEventRefs, fetchNbaTeams,
│   │                            #   buildNbaFeedUrl, filter-state toggles
│   ├── home/
│   │   ├── home-selector.tsx    # Segmented Leagues | Teams control + team tile grid
│   │   └── utils/homeTab.ts     # Tab type + localStorage normalization
│   ├── cricket-teams/           # Team page UI:
│   │   ├── cricket-team-event-card.tsx      # card (series name + format badge)
│   │   ├── cricket-team-filter-selector.tsx # format pills + show-past toggle
│   │   ├── cricket-team-calendar-links.tsx  # download + feed links + save
│   │   └── utils/               # buildCricketTeamFeedUrl, filter-state toggles
│   ├── header/header.tsx
│   ├── footer/footer.tsx
│   └── ui/                      # shadcn components (Card, Button, Badge, Sheet, Checkbox, Select, etc.)
├── routes/
│   ├── __root.tsx               # Layout: Header + Outlet + Footer
│   ├── index.tsx                # Home: segmented Leagues | Teams tile selector
│   ├── cricket-teams.$teamId.tsx# Cricket team schedule page
│   ├── my-calendar.tsx          # Personal calendar (signed-in)
│   ├── nba.tsx  nfl.tsx  f1.tsx  ipl.tsx  fifa.tsx
└── main.tsx                     # React Query (stale: 30m, gc: 60m) + Router bootstrap + PostHog init + AuthProvider

supabase/                        # Calendar feed backend (see docs/BACKEND.md)
├── config.toml
├── migrations/                  # Postgres schema: calendars, subscriptions, pinned events (RLS)
└── functions/
    ├── deno.json
    ├── _shared/                 # params.ts (query parsing), icsHeaders.ts, personalCalendar.ts
    └── calendar/                # Hono app: GET /calendar/{nba,nfl,f1,ipl,fifa}.ics + /calendar/my/<token>.ics
```

---

## Technical Patterns

### 1. Generic Base Components with Injected Functions
`InfiniteScrollEvents<T, F>` and `DownloadIcalButton<T, F>` are league-agnostic. They accept:
- `league` — string identifier (e.g. `"nfl"`) used as the React Query cache key prefix **and** analytics context
- `fetchEventRefs` — league-specific fetcher
- `filterEvents` — league-specific filter logic
- `transformEventsToIcs` — league-specific ICS transform
- `renderEventCard` — league-specific card component

### 2. ESPN `$ref` Pattern
ESPN's API returns paginated arrays of `{ $ref: URL }` objects. The app fetches refs first (cheap, paginated), then lazily follows each URL for full event/team details.

### 3. Concurrency-Limited Fetching
Following many `$ref`s at once (full-season export and feeds) is capped via `mapWithConcurrency()` (`shared/src/espn/mapWithConcurrency.ts`) so the device isn't flooded with parallel requests. Used by the client download button and the per-league `fetch.ts` orchestrators (also the backend); see its docstring for the cap rationale.

### 4. React Query for All Server State
- `useInfiniteQuery` powers infinite scroll pagination
- `useQuery` fetches individual event and team details per card
- 30-min stale time + 60-min GC = aggressive caching (no repeat network calls on revisit)

### 5. Per-Sport Self-Contained Modules
Each sport (`nba/`, `nfl/`, `f1/`, `ipl/`, `fifa/`, plus the cross-series
`cricketTeam/` dimension) owns its logic in two places:
- `shared/src/<league>/` — `types`, `filters`, `fetch` (full-season), `transform` (to ICS). This is the source of truth reused by the Supabase backend.
- `client/components/<league>/` — the card, filter selector/pills, and a `utils/` folder of client-side glue only: infinite-scroll fetch wrappers, team fetchers, feed-URL builders, and filter-state toggle helpers. The filtering predicates, transforms, durations, and event-status helpers are imported from `@sports-calendar/shared` rather than duplicated here.

### 5a. Calendar Feed Subscriptions
Beyond one-time `.ics` download, the app offers live subscription feeds. `add-to-calendar-feed-links.tsx` surfaces Copy / Apple / Google links whose URLs are built by `client/lib/buildCalendarFeedUrl.ts` from `VITE_CALENDAR_FEED_BASE_URL`. Those URLs point at the Supabase Edge Function (`supabase/functions/calendar/`), which re-fetches from ESPN on each request so subscribed calendars stay current. See `docs/BACKEND.md`.

### 5b. Personal Calendars (accounts)
Signing in (Supabase Auth: Google OAuth or magic link; `client/components/auth/`)
unlocks a personal calendar stored in Supabase Postgres. From any league page,
"Save to My Calendar" stores that league with the currently selected filters
(`calendar_subscriptions`, one row per league — cricket teams get one row per
followed team, keyed by a generated `team_key` column — upsert semantics) and
each event card gets a pin toggle (`calendar_pinned_events`; cricket pins store
`"{seriesId}:{eventId}"`). The `/my-calendar` route lists
everything with remove actions and surfaces the combined feed URL
(`<base>/my/<feed_token>.ics`, regenerable). All client access goes through
supabase-js against RLS owner-only tables (`client/api/calendar/`); the Edge
Function reads by token with the service role (see `docs/BACKEND.md`). Without
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` every account surface hides and the
anonymous app is unchanged.

### 6. Analytics with PostHog
`client/lib/analytics.ts` is the single point of contact for PostHog. It:
- Initialises PostHog from `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` env vars; silently no-ops if the key is absent (safe for dev/test)
- Exports a typed `analytics` object with one function per tracked interaction
- Page views are captured via a `router.subscribe('onResolved', ...)` hook in `main.tsx`, so every TanStack Router navigation fires `$pageview` automatically
- All events carry a `league` property (`"nfl"`, `"nba"`, `"f1"`, `"ipl"`, `"fifa"`, `"cricket-team"`) for easy segmentation in PostHog

The full catalogue of tracked events lives in `client/lib/analytics.ts` — one typed function per interaction (page views, filter toggles, downloads, feed-link clicks, pagination).

### 7. File-Based Routing
`@tanstack/react-router` auto-generates `client/routeTree.gen.ts` from the `client/routes/` file structure.

### 8. Type Hierarchy
`BaseEvent` / `BaseTeam` serve as shared bases. Sport-specific types extend them. Filter types are per-sport (`NbaEventFilters`, `F1EventFilters` with `types: string[]` for session filtering).

---

## Data Flow

```
User navigates to /nba (NBA/NFL/F1/FIFA — ESPN Core API, $ref pagination)
  → Route initializes filter state (useState)
  → InfiniteScrollEvents: useInfiniteQuery fetches paginated EventRef[]
  → IntersectionObserver fires fetchNextPage() as user scrolls
  → Each EventRef → NbaEventCard → useQuery(fetchEventDetails) + useQuery(fetchTeamDetails)

User navigates to /ipl (ESPN Site API — inline data, no $ref)
  → Each "page" is one calendar date; useInfiniteQuery walks the season day by day
  → Events come back fully populated (teams/logos inline), no follow-up fetch

User picks a team from home's Teams tab → /cricket-teams/6 (India)
  → One useQuery: fetchAllCricketTeamEvents
      series discovery (header endpoint, daily + monthly scan)
      → per-series match-day calendars → per-day scoreboards
      → filter to the team, dedupe (a Test appears once per match day), sort
  → Format pills + show-past toggle filter client-side; cards render inline
  → Download / live feed (/cricket-team/6.ics) / Save / Pin from the same page

Download button (one-time .ics file):
  → Fetch all event refs (from cache + remaining pages)
  → Concurrently fetch all event details (max 8 in flight)
  → Apply filter → Transform to iCalendar EventAttributes[]
  → Write .ics Blob → js-file-download

Subscribe (live feed):
  → buildCalendarFeedUrl(league, params) → <VITE_CALENDAR_FEED_BASE_URL>/<league>.ics?…
  → Calendar app polls the Supabase Edge Function (docs/BACKEND.md)
  → Function fetches fresh ESPN data → filters → returns .ics on every request

Personal calendar (signed in):
  → Save league / pin event → supabase-js writes RLS-protected rows
  → My Calendar page lists subscriptions + pins (React Query: useMyCalendar)
  → Calendar app polls <base>/my/<feed_token>.ics
  → Function: token → calendar rows → per league fetch/filter/pin-union → deduped .ics
```
