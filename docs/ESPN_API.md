# ESPN API Reference

This document describes how the ESPN Core API works as used by this project. ESPN's API is **unofficial and undocumented** — it is reverse-engineered from their own web and mobile apps and may change without notice.

**Reference:** [Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API) — community-maintained documentation of discovered endpoints.

---

## 1. Background

Two ESPN API domains exist; this project only uses one:

| Domain | Used? | Shape |
|--------|-------|-------|
| `sports.core.api.espn.com` | **Yes** | Returns structured stubs with `$ref` links for lazy-loading |
| `site.api.espn.com` | No | Returns richer inline data in a flatter shape |

No authentication is required. Rate limits are not published. The Core API was chosen here because its `$ref` pattern maps naturally to the infinite-scroll + per-card fetch architecture.

---

## 2. Base URL & League Identifiers

```
https://sports.core.api.espn.com/v2/sports/{sportId}/leagues/{leagueId}/...
```

Leagues currently supported by this project:

| League | `sportId`    | `leagueId` | `seasonId` |
|--------|-------------|------------|------------|
| NBA    | `basketball` | `nba`        | `2026`     |
| NFL    | `football`   | `nfl`        | `2025`     |
| F1     | `racing`     | `f1`         | `2026`     |
| FIFA   | `soccer`     | `fifa.world` | `2026`     |

**Season ID convention:** The season ID is the **calendar year the season starts**, even when it extends into the following year. For example, the 2025 NFL season begins in September 2025 and ends in February 2026, but the API uses `2025`. These are hardcoded in:
- `src/components/nba/utils/fetchNbaEventRefs.ts`
- `src/components/nfl/utils/fetchNflEventRefs.ts`
- `src/components/f1/utils/fetchF1EventRefs.ts`

---

## 3. The `$ref` Pattern

The Core API never returns full nested objects inline. Every sub-resource is represented as a stub:

```json
{ "$ref": "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/2" }
```

To get the actual data, you follow the URL with a second fetch. This project implements two generic ref-followers:

```ts
// src/api/espn/fetchEventDetails.ts
export async function fetchEventDetails<T = BaseEvent>(refUrl: string): Promise<T>

// src/api/espn/fetchTeamDetails.ts
export async function fetchTeamDetails<T = BaseTeam>(refUrl: string): Promise<T>
```

### HTTPS normalization (persistent ESPN bug)

ESPN's API frequently returns `http://` instead of `https://` in `$ref` URLs. This is a known, persistent bug in their API. Both fetcher functions always normalize before requesting:

```ts
refUrl = refUrl.replace("http://", "https://");
```

This line must stay — it is not defensive dead code.

---

## 4. Paginated Event Refs

### Endpoint

```
GET /v2/sports/{sportId}/leagues/{leagueId}/seasons/{seasonId}/types/{seasonTypeId}/events/
    ?limit={pageSize}&page={pageNumber}
```

Implemented in `src/api/espn/fetchEventRefs.ts` → `fetchEventRefsBySeason()`.  
Per-sport wrappers set `pageSize: 30` and pass `pageNumber` from the infinite scroll cursor.

### Response shape

```json
{
  "items": [
    { "$ref": "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/401767755" },
    { "$ref": "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/401767756" }
  ],
  "pageCount": 17,
  "pageIndex": 1
}
```

`pageCount` drives infinite scroll termination in `InfiniteScrollEvents` — fetching stops when `pageIndex >= pageCount`.

### Season type IDs (`types/{seasonTypeId}`)

The `types/` segment filters which **phase** of the season is returned. All three leagues hardcode `types/2`:

| ID | Meaning | Used |
|----|---------|------|
| `1` | Preseason | **Yes** |
| `2` | Regular Season | **Yes** |
| `3` | Postseason / Playoffs | **Yes** |
| `4` | All-Star / Special Events | No |
| `5` | Play-In Tournament (NBA only) | **Yes** |

These IDs are hardcoded because their full range of valid values is not well-understood and differs by league. For example, F1 likely does not have a meaningful distinction between season types the way team sports do — a single `types/2` call returns the full race calendar. The NBA has a distinct In-Season Tournament and Play-In Tournament that may map to their own type IDs. NFL Conference Championship games may or may not be separated from other Playoff games.

---

## 5. Event Structure

Every event `$ref` from the items list resolves to an object that extends `BaseEvent` (`src/types/base.ts`):

```ts
type BaseEvent = {
  $ref: string;
  id: string;
  date: string;       // ISO 8601 — matches the first/only competition's start time
  name: string;       // e.g. "Los Angeles Lakers at Boston Celtics"
  shortName: string;  // e.g. "LAL @ BOS"
  season: { $ref: string };
  // competitions: Competition[]  ← sport-specific, see below
};
```

For NBA and NFL, one event = one game with one competition.  
For F1, one event = one race weekend with 4–6 competitions (one per session).

---

## 6. NBA & NFL Event Competitions

### `NbaEvent` / `NflEvent` (virtually identical structures)

Defined in `src/types/nba.ts` and `src/types/nfl.ts`.

```ts
type NbaEventCompetition = {
  $ref: string;
  id: string;
  date: string;           // ISO 8601 game start time
  type: {
    id: string;           // numeric string — see type ID table below
    text: string;         // e.g. "Regular Season"
    abbreviation: string; // e.g. "RS"
    slug?: string;        // kebab-case; sometimes absent
    type?: string;        // internal classifier; sometimes absent
  };
  timeValid: boolean;     // false when game time is TBD
  recent: boolean;
  bracketAvailable: boolean;
  gameSource: { id: string; description: string; state: string };
  status?: { $ref: string };   // absent on some future games
  venue: {
    $ref: string;
    fullName: string;           // e.g. "TD Garden"
    address: { city: string; state: string };
  };
  competitors: Array<{
    $ref: string;
    homeAway: "home" | "away";
    winner?: boolean;           // only present on completed games
    team: { $ref: string };     // follow to get NbaTeam / NflTeam
    score?: { $ref: string };   // present but never followed (schedule-focused)
  }>;
};
```

Notes:
- `status` is **optional** — may be absent for games far in the future
- `winner` is **optional** — only present on completed games
- `score.$ref` is never followed by this project; we display schedules, not live scores

### Competition type IDs

`competition.type` reflects the **nature of the game**, not always the season phase. Even when fetching via `types/2` (Regular Season), the competition's own `type.id` is returned and can be used for display or filtering.

**Known values** (NFL is identical):

| `id` | `abbreviation` | Human-readable |
|------|---------------|----------------|
| `"1"` | `"PS"` | Preseason |
| `"2"` | `"RS"` | Regular Season |
| `"3"` | `"PO"` | Playoffs |
| `"4"` | `"AS"` | All-Star |
| `"5"` | `"FIN"` | Finals |

The full set of IDs is not confirmed. Additional values may exist for the NBA In-Season Tournament, Play-In Tournament, or other special events. Unknown values fall through to a no-op in the translator functions.

---

## 7. F1 Event Competitions

### `F1Event`

Defined in `src/types/f1.ts`.

```ts
type F1EventCompetition = {
  $ref: string;
  id: string;
  date: string;     // ISO 8601 session start time
  type: {
    id: string;           // session type ID — see table below
    text: string;         // e.g. "Practice 1", "Qualifying", "Race"
    abbreviation: string; // e.g. "FP1", "Qual", "Race"
    // NOTE: slug and type fields are ABSENT for F1
  };
  timeValid: boolean;
  recent: boolean;
  bracketAvailable: boolean;
  gameSource: { id: string; description: string; state: string };
  status: { $ref: string };  // required (not optional like NBA/NFL)
  session: number;           // session sequence number within the weekend
};
```

### Key structural differences from NBA/NFL

| Field | NBA / NFL | F1 |
|-------|-----------|----|
| `competitions` per event | 1 | 4–6 (one per session) |
| `type.id` meaning | Season phase (Regular Season, Playoffs…) | Session type (Practice, Qualifying, Race…) |
| `type.slug` / `type.type` | Present (optional) | **Absent** |
| `competition.venue` | Present — `fullName` + `address` | **Absent** |
| `competition.competitors` | Present — two teams | **Absent** — no driver/team data |
| `competition.session` | **Absent** | Present |
| `competition.status` | Optional | Required |

### F1 competition type IDs

For F1, `competition.type.id` identifies the **session within the race weekend**, not the season phase. This is a fundamental semantic difference from how NBA/NFL use the same `type` field.

**Known values** (from `src/components/f1/utils/translateF1EventType.ts`):

| `id` | `abbreviation` | Human-readable | Default filter |
|------|---------------|----------------|----------------|
| `"1"` | `"FP1"` / `"FP2"` / `"FP3"` | Free Practice 1 / 2 / 3 | Hidden |
| `"2"` | `"Qual"` | Qualifying | Shown |
| `"3"` | `"Race"` | Race | Shown |
| `"5"` | `"SS"` | Sprint Qualifying (Sprint Shootout) | Shown |
| `"6"` | `"SR"` | Sprint Race | Shown |

Notes:
- Type ID `"1"` covers all free practice sessions; `abbreviation` ("FP1", "FP2", "FP3") differentiates them
- Type ID `"4"` (`"Sprint"`) is the legacy pre-2023 sprint format and does not appear in current seasons — it is intentionally unmapped
- Sprint weekends replace some practice sessions with Sprint Qualifying (`"5"`) and Sprint Race (`"6"`); the exact session set may vary
- Default filter in `src/routes/f1.tsx`: `types: ["2", "3", "5", "6"]` — practice hidden by default

### F1 event names and sponsor cleanup

F1 event names contain title sponsor prefixes (e.g. `"Qatar Airways Bahrain Grand Prix"`). `cleanUpSponsorName()` in `src/components/f1/utils/cleanUpSponsorName.ts` strips known sponsors for display and ICS titles.

Current sponsor list: Qatar Airways, Heineken, Aramco, Gulf Air, STC, Crypto.com, Lenovo, MSC Cruises, Pirelli, AWS, Tag Heuer, Singapore Airlines, Etihad Airways.

---

## 8. Team Details

Fetched by following `competitor.team.$ref`. **Only used for NBA and NFL** — F1 has no competitor data.

```ts
// src/types/nba.ts, src/types/nfl.ts
type NbaTeam = BaseTeam & {
  logos: Array<{
    href: string;   // absolute URL to logo image (ESPN CDN)
    rel: string[];  // variant tags, e.g. ["default"] or ["dark"]
  }>;
};
```

Logo selection in `NbaEventCard`:
```ts
team.logos.find(logo => logo.rel.includes("default"))
```

Known `rel` values: `"default"` (for light backgrounds), `"dark"` (for dark backgrounds). The card always selects `"default"`.

---

## 9. Fetch Pipeline

How the three layers of API calls map to the application:

```
Step 1 — Paginated refs
  GET …/seasons/{id}/types/2/events/?limit=30&page=N
  → { items: [{ $ref }…], pageCount, pageIndex }

  fetchEventRefsBySeason()  →  useInfiniteQuery (InfiniteScrollEvents)
  Triggered by: IntersectionObserver as user scrolls past sentinel

Step 2 — Event details (one per card)
  GET {event.$ref}
  → NbaEvent | NflEvent | F1Event

  fetchEventDetails<T>()  →  useQuery per EventCard
  Triggered by: each card mount

Step 3 — Team details (NBA/NFL only, one per competitor)
  GET {competitor.team.$ref}
  → NbaTeam | NflTeam

  fetchTeamDetails<T>()  →  useQuery per TeamLogo
  Triggered by: each competitor in the rendered card
```

React Query is configured globally with `staleTime: 30m` and `gcTime: 60m`, so navigating away and back does not re-fetch.

### Concurrency during ICS export

`DownloadIcalButton` (`src/components/base/download-ical-button.tsx`) fetches all event details at once for the full season export. It uses a custom `mapWithConcurrency(items, 8, fn)` to cap simultaneous requests at 8. The limit of 8 is **arbitrary** — chosen to avoid overwhelming the user's device with too many parallel network requests, not to work around any known ESPN server-side rate limit.

---

## 10. ICS Export Mapping

| League | Calendar title format | Duration | Source fields |
|--------|----------------------|----------|---------------|
| NBA | `NBA: {event.shortName}` | 2h 30m | `competition.date`, `event.shortName` |
| NFL | `NFL: {event.shortName}` | 2h 30m | `competition.date`, `event.shortName` |
| F1  | `F1: {sessionType} ({cleanedName})` | 1h | `competition.date`, `competition.type.abbreviation`, `event.shortName` |

F1 example output: `"F1: Qualifying (Bahrain Grand Prix)"` — sponsor stripped from event name, abbreviation translated to full session type name.

Transform functions:
- `src/components/nba/utils/transformNbaEventsToIcs.ts`
- `src/components/nfl/utils/transformNflEventsToIcs.ts`
- `src/components/f1/utils/transformF1EventsToIcs.ts`

---

## 11. Expanding to Other Leagues

The `fetchEventRefsBySeason()` + `fetchEventDetails()` pipeline is generic and works for any ESPN sport. Known league identifiers from the Public-ESPN-API reference:

| League         | `sportId`    | `leagueId`       | Notes |
|----------------|-------------|------------------|-------|
| MLB            | `baseball`  | `mlb`            | Inning-based periods (1–9+); different status shape |
| NHL            | `hockey`    | `nhl`            | Period-based (1–3) + OT/SO |
| MLS            | `soccer`    | `usa.1`          | Half-based; 100+ soccer `leagueId` slugs available |
| Premier League | `soccer`    | `eng.1`          | Same structure as MLS |
| WNBA           | `basketball`| `wnba`           | Expected to match NBA structure |
| NASCAR         | `racing`    | `nascar-premier` | Session structure vs F1 is unknown |
| IndyCar        | `racing`    | `irl`            | Session structure vs F1 is unknown |

**Caution:** Team sports with non-standard period structures (baseball, soccer) will have different competition shapes. Other racing series may not use F1's multi-competition-per-event model.

---

## 12. IPL Cricket

IPL uses a **completely different API domain** and cannot be fetched via `sports.core.api.espn.com`. The Core API returns an empty leagues list for cricket (`/v2/sports/cricket/leagues` → `{"count":0,"items":[]}`).

### Domain

```
https://site.api.espn.com/apis/site/v2/sports/cricket/{leagueId}/{resource}
```

The Site API returns **inline data** — no `$ref` stub-following is needed. Teams, scores, and match status are all embedded directly in the event object.

### IPL-specific endpoints

| Endpoint | Returns |
|---|---|
| `/8048/events?dates=YYYYMMDD` | All IPL matches on a given calendar day |
| `/8048/scoreboard` | All 10 teams (top-level `teams[]`), current events, standings, season metadata |

### IPL season

| Field | Value |
|---|---|
| League ID | `8048` |
| 2026 season start | 2026-03-28 |
| 2026 season end | 2026-05-24 |
| Season ID concept | Not used — events are fetched by **date** not season type |

### Event shape (Site API)

Each event from `/events?dates=YYYYMMDD` is a single match object with competitors inline:

```json
{
  "id": "1527690",
  "date": "2026-04-11T10:00:00Z",
  "name": "Punjab Kings v Sunrisers Hyderabad",
  "shortName": "PBKS v SRH",
  "fullStatus": { "type": { "state": "pre" }, "summary": "Starts at 15:30 local time" },
  "competitors": [
    { "id": "335973", "homeAway": "home", "displayName": "Punjab Kings",
      "abbreviation": "PBKS", "logo": "https://a.espncdn.com/i/teamlogos/cricket/500/335973.png" },
    { "id": "628333", "homeAway": "away", "displayName": "Sunrisers Hyderabad",
      "abbreviation": "SRH", "logo": "https://a.espncdn.com/i/teamlogos/cricket/500/628333.png" }
  ]
}
```

Note: each event **is** the competition (no `competitions[]` array). Team logos are direct URLs using the pattern `https://a.espncdn.com/i/teamlogos/cricket/500/{teamId}.png`.

### Team listing

The `/8048/scoreboard` endpoint's top-level `teams[]` array lists all 10 IPL franchises with `id`, `displayName`, and `abbreviation`. Logo URLs are not included in the scoreboard response but follow the `cricket/500/{id}.png` pattern above.

### Implementation pattern

Because there is no page-number-based pagination, the IPL implementation iterates dates:

```ts
// Generates all YYYYMMDD strings for the season
getIplSeasonDates() → ["20260328", "20260329", ..., "20260524"]

// useInfiniteQuery: each "page" is one calendar date
initialPageParam: getIplSeasonDates()[0]
getNextPageParam: (_, __, lastDateStr) => nextDateInArray | undefined
```

Days with no matches return `{ events: [] }` — the empty array is handled gracefully.