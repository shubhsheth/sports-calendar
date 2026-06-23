# Sports Calendar — Project Overview

## Main Goal

A React SPA that fetches NBA, NFL, and F1 schedules from the **ESPN Sports Core API**, displaying them with infinite scroll, event filtering, and `.ics` calendar file export for import into any calendar app.

Deployed at: https://shubhsheth.github.io/sports-calendar/

---

## Technologies

| Layer | Technology |
|-------|-----------|
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
| Deployment | GitHub Pages via GitHub Actions |

---

## Documentation

| File | Description |
|------|-------------|
| `docs/ESPN_API.md` | ESPN Core API reference — endpoints, `$ref` pattern, per-league event structures, fetch pipeline, ICS mapping, and candidate leagues for expansion |

---

## Directory Structure

```
docs/
└── ESPN_API.md                  # ESPN Core API reference
.env.example                     # Required environment variables (PostHog key/host)
src/
├── api/espn/
│   ├── fetchEventRefs.ts        # Paginated event references from ESPN
│   ├── fetchEventDetails.ts     # Full event details by ref URL
│   └── fetchTeamDetails.ts      # Team info by ref URL
├── lib/
│   ├── analytics.ts             # PostHog init + typed event tracking helpers
│   └── utils.ts                 # cn() class merging utility
├── components/
│   ├── base/
│   │   ├── infinite-scroll-events.tsx   # Generic infinite scroll (accepts league prop)
│   │   └── download-ical-button.tsx     # Generic ICS export with concurrency control (accepts league prop)
│   ├── nba/
│   │   ├── nba-event-card.tsx
│   │   ├── nba-filter-selector.tsx
│   │   └── utils/               # fetchNbaEventRefs, filterNbaEvents, transformNbaEventsToIcs
│   ├── nfl/
│   │   └── utils/               # fetchNflEventRefs, transformNflEventsToIcs
│   ├── f1/
│   │   ├── f1-event-card.tsx
│   │   ├── f1-filter-selector.tsx
│   │   └── utils/               # fetchF1EventRefs, filterF1Events, transformF1EventsToIcs, translateF1EventType, cleanUpSponsorName
│   ├── header/header.tsx
│   ├── footer/footer.tsx
│   └── ui/                      # shadcn components (Card, Button, Badge, Sheet, Checkbox, Select, etc.)
├── routes/
│   ├── __root.tsx               # Layout: Header + Outlet + Footer
│   ├── index.tsx                # Home: sport selection grid
│   ├── nba.tsx
│   ├── nfl.tsx
│   └── f1.tsx
├── types/
│   ├── base.ts                  # EventRef, BaseEvent, BaseTeam
│   ├── nba.ts                   # NbaEvent, NbaTeam, NbaEventFilters
│   ├── nfl.ts                   # NflEvent, NflTeam, NflEventFilters
│   └── f1.ts                    # F1Event, F1EventFilters
└── main.tsx                     # React Query (stale: 30m, gc: 60m) + Router bootstrap + PostHog init
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
`download-ical-button.tsx` implements `mapWithConcurrency()` using `Promise.race()` to cap parallel ESPN API calls at 8, preventing rate limiting when downloading full season data.

### 4. React Query for All Server State
- `useInfiniteQuery` powers infinite scroll pagination
- `useQuery` fetches individual event and team details per card
- 30-min stale time + 60-min GC = aggressive caching (no repeat network calls on revisit)

### 5. Per-Sport Self-Contained Modules
Each sport (`nba/`, `nfl/`, `f1/`) owns its card, filter selector, and utils (fetch / filter / transform / translate).

### 6. Analytics with PostHog
`src/lib/analytics.ts` is the single point of contact for PostHog. It:
- Initialises PostHog from `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` env vars; silently no-ops if the key is absent (safe for dev/test)
- Exports a typed `analytics` object with one function per tracked interaction
- Page views are captured via a `router.subscribe('onResolved', ...)` hook in `main.tsx`, so every TanStack Router navigation fires `$pageview` automatically
- All events carry a `league` property (`"nfl"`, `"nba"`, `"f1"`, `"ipl"`) for easy segmentation in PostHog

**Key events:** `$pageview`, `league_selected`, `filter_panel_opened`, `filter_show_past_events_toggled`, `filter_team_toggled`, `filter_event_type_toggled` (F1), `filter_select_all_clicked`, `filter_clear_clicked`, `filter_pill_removed`, `calendar_download_opened`, `calendar_downloaded`, `schedule_next_page_loaded`

### 7. File-Based Routing
`@tanstack/react-router` auto-generates `routeTree.gen.ts` from the `src/routes/` file structure.

### 8. Type Hierarchy
`BaseEvent` / `BaseTeam` serve as shared bases. Sport-specific types extend them. Filter types are per-sport (`NbaEventFilters`, `F1EventFilters` with `types: string[]` for session filtering).

---

## Data Flow

```
User navigates to /nba
  → Route initializes filter state (useState)
  → InfiniteScrollEvents: useInfiniteQuery fetches paginated EventRef[]
  → IntersectionObserver fires fetchNextPage() as user scrolls
  → Each EventRef → NbaEventCard → useQuery(fetchEventDetails) + useQuery(fetchTeamDetails)

Download button:
  → Fetch all event refs (from cache + remaining pages)
  → Concurrently fetch all event details (max 8 in flight)
  → Apply filter
  → Transform to iCalendar EventAttributes[]
  → Write .ics Blob → js-file-download
```
