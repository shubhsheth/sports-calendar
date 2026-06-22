# Sports Calendar — Project Overview

## Main Goal

A React SPA that fetches sports schedules from the **ESPN APIs**, displaying them with infinite scroll and event filtering. Fixtures can be exported as an `.ics` file for import into any calendar app, or followed as a **live, auto-updating subscription feed** served by a Supabase Edge Function backend.

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
    ├── nba/ nfl/ f1/ ipl/ fifa/ # Per-league modules, each with:
    │   ├── types.ts             #   league event/team/filter types
    │   ├── filters.ts           #   filter<League>Events
    │   ├── fetch.ts             #   fetchAll<League>Events (full-season fetch)
    │   └── transform.ts         #   transform<League>EventsToIcs
    └── index.ts                 # Barrel re-exporting everything above

client/                          # @sports-calendar/client — the React SPA
├── api/espn/
│   └── fetchTeamDetails.ts      # Team info by ref URL (NBA/NFL)
├── lib/
│   ├── analytics.ts             # PostHog init + typed event tracking helpers
│   ├── buildCalendarFeedUrl.ts  # Builds subscription feed URLs from VITE_CALENDAR_FEED_BASE_URL
│   └── utils.ts                 # cn() class merging utility
├── components/
│   ├── base/
│   │   ├── infinite-scroll-events.tsx     # Generic infinite scroll (accepts league prop)
│   │   ├── download-ical-button.tsx       # Generic ICS export with concurrency control
│   │   ├── add-to-calendar-feed-links.tsx # Copy/Apple/Google subscription links
│   │   └── filter-pill.tsx
│   ├── nba/ nfl/ f1/ ipl/ fifa/ # Per-league UI + utils/, e.g. nba/:
│   │   ├── nba-event-card.tsx
│   │   ├── nba-filter-selector.tsx
│   │   ├── nba-filter-pills.tsx
│   │   └── utils/               # client-side glue: fetchNbaEventRefs, fetchNbaTeams,
│   │                            #   buildNbaFeedUrl, filter-state toggles, translateNbaEventType
│   ├── header/header.tsx
│   ├── footer/footer.tsx
│   └── ui/                      # shadcn components (Card, Button, Badge, Sheet, Checkbox, Select, etc.)
├── routes/
│   ├── __root.tsx               # Layout: Header + Outlet + Footer
│   ├── index.tsx                # Home: sport selection grid
│   ├── nba.tsx  nfl.tsx  f1.tsx  ipl.tsx  fifa.tsx
└── main.tsx                     # React Query (stale: 30m, gc: 60m) + Router bootstrap + PostHog init

supabase/                        # Calendar feed backend (see docs/BACKEND.md)
├── config.toml
└── functions/
    ├── deno.json
    ├── _shared/                 # params.ts (query parsing), icsHeaders.ts
    └── calendar/index.ts        # Hono app: GET /calendar/{nba,nfl,f1,ipl}.ics
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
`shared/src/espn/mapWithConcurrency.ts` implements `mapWithConcurrency()` using `Promise.race()` to cap parallel ESPN API calls (default 8), preventing the device from being overwhelmed when fetching full-season data. Used both by `download-ical-button.tsx` (client export) and the per-league `fetch.ts` orchestrators (`shared/`, also used by the backend).

### 4. React Query for All Server State
- `useInfiniteQuery` powers infinite scroll pagination
- `useQuery` fetches individual event and team details per card
- 30-min stale time + 60-min GC = aggressive caching (no repeat network calls on revisit)

### 5. Per-Sport Self-Contained Modules
Each sport (`nba/`, `nfl/`, `f1/`, `ipl/`, `fifa/`) owns its logic in two places:
- `shared/src/<league>/` — `types`, `filters`, `fetch` (full-season), `transform` (to ICS). This is the source of truth reused by the Supabase backend.
- `client/components/<league>/` — the card, filter selector/pills, and a `utils/` folder of client-side glue only: infinite-scroll fetch wrappers, team fetchers, feed-URL builders, and filter-state toggle helpers. The filtering predicates, transforms, durations, and event-status helpers are imported from `@sports-calendar/shared` rather than duplicated here. The one remaining local helper is NBA's `translateNbaEventType`.

### 5a. Calendar Feed Subscriptions
Beyond one-time `.ics` download, the app offers live subscription feeds. `add-to-calendar-feed-links.tsx` surfaces Copy / Apple / Google links whose URLs are built by `client/lib/buildCalendarFeedUrl.ts` from `VITE_CALENDAR_FEED_BASE_URL`. Those URLs point at the Supabase Edge Function (`supabase/functions/calendar/`), which re-fetches from ESPN on each request so subscribed calendars stay current. See `docs/BACKEND.md`.

### 6. Analytics with PostHog
`client/lib/analytics.ts` is the single point of contact for PostHog. It:
- Initialises PostHog from `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` env vars; silently no-ops if the key is absent (safe for dev/test)
- Exports a typed `analytics` object with one function per tracked interaction
- Page views are captured via a `router.subscribe('onResolved', ...)` hook in `main.tsx`, so every TanStack Router navigation fires `$pageview` automatically
- All events carry a `league` property (`"nfl"`, `"nba"`, `"f1"`, `"ipl"`, `"fifa"`) for easy segmentation in PostHog

**Key events:** `$pageview`, `league_selected`, `filter_panel_opened`, `filter_show_past_events_toggled`, `filter_team_toggled`, `filter_event_type_toggled` (F1), `filter_select_all_clicked`, `filter_clear_clicked`, `filter_pill_removed`, `calendar_download_opened`, `calendar_downloaded`, `calendar_feed_url_copied`, `calendar_feed_apple_clicked`, `calendar_feed_google_clicked`, `schedule_next_page_loaded`

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

Download button (one-time .ics file):
  → Fetch all event refs (from cache + remaining pages)
  → Concurrently fetch all event details (max 8 in flight)
  → Apply filter → Transform to iCalendar EventAttributes[]
  → Write .ics Blob → js-file-download

Subscribe (live feed):
  → buildCalendarFeedUrl(league, params) → <VITE_CALENDAR_FEED_BASE_URL>/<league>.ics?…
  → Calendar app polls the Supabase Edge Function (docs/BACKEND.md)
  → Function fetches fresh ESPN data → filters → returns .ics on every request
```
