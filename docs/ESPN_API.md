# ESPN API Reference

How this project consumes ESPN's **unofficial, undocumented** APIs
(reverse-engineered from their web/mobile apps; they may change without notice).
This is a conceptual overview — exact response shapes, type-ID meanings, season
phases, durations, and per-league quirks live in docstrings on the relevant
functions and types, linked from each section below.

**Reference:** [Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API) —
community-maintained endpoint docs.

## Two API shapes

| Domain | Shape | Used for |
|--------|-------|----------|
| `sports.core.api.espn.com` (Core) | Structured `$ref` stubs, lazy-loaded | NBA, NFL, F1, FIFA |
| `site.api.espn.com` (Site) | Richer inline data, no `$ref` following | IPL (cricket) |

No authentication is required and rate limits are unpublished. The Core API's
`$ref` pattern maps naturally onto the infinite-scroll + per-card fetch
architecture; cricket isn't on the Core API, so IPL uses the Site API instead.

## League identifiers

| League | `sportId` | `leagueId` | `seasonId` |
|--------|-----------|------------|------------|
| NBA  | `basketball` | `nba`        | `2026` |
| NFL  | `football`   | `nfl`        | `2025` |
| F1   | `racing`     | `f1`         | `2026` |
| FIFA | `soccer`     | `fifa.world` | `2026` |
| IPL  | Site API — cricket | `8048` | n/a (date-based) |

**Season ID convention:** the calendar year the season *starts*, even if it runs
into the next year (e.g. the 2025 NFL season runs Sep 2025 – Feb 2026 but uses
`2025`). Each league's identifiers and season phases live in
`shared/src/<league>/fetch.ts` (full-season) and its `fetch*EventRefs` wrapper
under `client/components/<league>/utils/` (infinite scroll).

## Core API patterns

These are the cross-cutting patterns every Core-API league shares.

- **`$ref` stubs.** The Core API never inlines nested objects; each sub-resource
  is a `{ "$ref": URL }` stub you follow with a second fetch. Generic followers:
  `fetchEventDetails` (`shared/src/espn/fetchEventDetails.ts`) and
  `fetchTeamDetails` (`client/api/espn/fetchTeamDetails.ts`). Both rewrite ESPN's
  `http://` refs to `https://` — see their docstrings for why that's required.
- **Paginated event refs.** `fetchEventRefsBySeason`
  (`shared/src/espn/fetchEventRefs.ts`) lists event stubs a page at a time and
  reports `pageCount`/`pageIndex` so callers know when to stop. The season
  phase(s) each league fetches are documented in its `fetch.ts`.
- **Concurrency-capped fan-out.** Following many refs at once (full-season
  export/feeds) goes through `mapWithConcurrency`
  (`shared/src/espn/mapWithConcurrency.ts`); see its docstring for the cap
  rationale.

## Fetch pipeline

Core-API leagues fan out over three layers, wired into React Query on the client
and the per-league `fetch.ts` orchestrators on the backend:

1. **Refs** — `fetchEventRefsBySeason` → paginated `$ref` list (drives
   `InfiniteScrollEvents` via `useInfiniteQuery`).
2. **Event details** — `fetchEventDetails(event.$ref)` → full event (one
   `useQuery` per card).
3. **Team details** — `fetchTeamDetails(competitor.team.$ref)` → team + logos
   (NBA/NFL only).

React Query caches aggressively (`staleTime` 30m / `gcTime` 60m, configured in
`client/main.tsx`) so revisiting a league doesn't refetch.

IPL skips this pipeline: the Site API returns fully inline events, fetched one
date at a time (see `shared/src/ipl/fetch.ts`).

## Event shapes (conceptual)

Every Core event extends `BaseEvent` (`shared/src/espn/fetchEventDetails.ts`);
per-league shapes are in `shared/src/<league>/types.ts`. The conceptual
differences that matter:

- **NBA / NFL** — one event = one game = one competition, with two
  `competitors` (follow `team.$ref` for logos). `competition.type.id` is the
  game's season phase.
- **F1** — one event = one race *weekend* with 4–6 competitions, one per
  session; no competitors or venue. Here `competition.type.id` is the *session*
  type, not a season phase.
- **IPL** (Site API) — each event *is* the match, with competitors and logos
  inline.

Competition type-ID meanings and their quirks are documented on the translator
functions: NBA/NFL in `client/components/nba/utils/translateNbaEventType.ts`,
F1 in `shared/src/f1/types.ts`.

## ICS export

Each league transforms its events to iCalendar in
`shared/src/<league>/transform.ts`, used by both the client download button and
the backend feed (see [`BACKEND.md`](BACKEND.md)). Per-league title formats and
event durations are documented in those transforms (e.g. F1 strips title-sponsor
prefixes via `cleanUpF1SponsorNames`).

## Expanding to other leagues

The `fetchEventRefsBySeason` + `fetchEventDetails` pipeline is generic across
ESPN sports. Candidate identifiers from the Public-ESPN-API reference:

| League | `sportId` | `leagueId` | Notes |
|--------|-----------|------------|-------|
| MLB | `baseball` | `mlb` | Inning-based periods; different status shape |
| NHL | `hockey` | `nhl` | Period-based + OT/SO |
| MLS | `soccer` | `usa.1` | Half-based; many soccer `leagueId` slugs exist |
| Premier League | `soccer` | `eng.1` | Same structure as MLS |
| WNBA | `basketball` | `wnba` | Expected to match NBA |
| NASCAR | `racing` | `nascar-premier` | Session structure vs F1 unknown |
| IndyCar | `racing` | `irl` | Session structure vs F1 unknown |

**Caution:** team sports with non-standard period structures (baseball innings,
soccer halves) have different competition shapes, and other racing series may not
use F1's multi-session-per-event model.
