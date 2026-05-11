# Spec: Calendar Sync Backend

## Objective

Build a lightweight HTTP service (Supabase Edge Function) that generates and serves `.ics` (iCalendar) feeds for each supported sports league. The feeds are subscription URLs that Apple Calendar and Google Calendar can periodically poll, so users always see up-to-date schedules without manually re-downloading a file.

**User:** Any fan who adds a sports league calendar to their native calendar app and wants it to stay current automatically.

**Success:** A user can paste a URL into Apple/Google Calendar's "Subscribe to calendar" flow and see live, filtered sports events that refresh on a schedule.

## User Stories

- As a fan, I want to subscribe to an NBA calendar filtered to my team so it appears in my calendar app and stays updated automatically.
- As a fan, I want to filter with `showPastEvents=false` so completed games don't clutter my calendar.
- As an F1 fan, I want to subscribe to only Race and Qualifying sessions, not practice.
- As a developer, I want filter params to mirror the frontend exactly so I can copy the URL from the web app.

## Functional Requirements

- **FR-1:** Expose one endpoint per league:
  - `GET /calendar/nba.ics`
  - `GET /calendar/nfl.ics`
  - `GET /calendar/f1.ics`
  - `GET /calendar/ipl.ics`
- **FR-2:** Accept the same filter query params the frontend uses per league:
  - NBA / NFL / IPL: `teamIds` (comma-separated IDs), `showPastEvents` (`true` / `false`)
  - F1: `types` (comma-separated session type IDs: 1, 2, 3, 4, 6), `showPastEvents` (`true` / `false`)
- **FR-3:** Return a valid `.ics` (RFC 5545) response with `Content-Type: text/calendar; charset=utf-8`.
- **FR-4:** Set `Cache-Control: public, max-age=3600` so calendar clients cache the feed locally for 1 hour.
- **FR-5:** Each calendar event must include: title, start/end datetime, location (venue, if available), description (teams, league, status), and a stable `UID` (e.g. `{eventId}@sports-calendar`).
- **FR-6:** ESPN fetches must use the same concurrency-capped pattern (limit 8 parallel requests) as the frontend to avoid rate limiting.
- **FR-7:** IPL uses date-range iteration (2026-03-28 to 2026-06-01); NBA / NFL / F1 use paginated `$ref` fetching.
- **FR-8:** Return HTTP 400 with a plain-text error body for invalid league or malformed params.
- **FR-9:** Set the `REFRESH-INTERVAL` iCal property to `PT1H` so clients know how often to poll.
- **FR-10:** Respond to `OPTIONS` requests with appropriate CORS headers to support web-based calendar tools.

## Non-Functional Requirements

- **NFR-1:** Cold response time under 10 seconds for a full-season calendar (ESPN network fetches are the bottleneck).
- **NFR-2:** No server-side cache. `Cache-Control: public, max-age=3600` instructs calendar clients to cache locally; each client refresh triggers a fresh ESPN fetch.
- **NFR-3:** `Access-Control-Allow-Origin: *` on all responses.
- **NFR-4:** No database, no auth, no user accounts — stateless.

## Out of Scope

- User accounts or personalized/authenticated calendar URLs
- Push notifications or webhooks when events change
- Historical seasons (current season only, matching frontend)
- A UI for building subscription URLs (belongs in the frontend)
- Real-time score or status updates within the feed

## Assumptions

- Filter params are passed as query strings; no request body is needed.
- ESPN public APIs remain unauthenticated and accessible from Supabase edge IPs.
- Season IDs remain: NBA 2026, NFL 2025, F1 2026, IPL date-range 2026-03-28–2026-06-01.
- The `ics` npm package is used for ICS generation, imported via `npm:ics` in Deno.
- Hono is used for routing, imported via `npm:hono` in Deno.

## Tech Stack

- **Runtime:** Supabase Edge Functions (Deno)
- **Framework:** Hono (`npm:hono` — supports Deno natively)
- **ICS generation:** `ics` npm package (`npm:ics`)
- **Tooling:** Supabase CLI, Vitest for shared package tests
- **Language:** TypeScript

## Commands

```
# From repo root
Local dev:   supabase start && supabase functions serve
Deploy:      supabase functions deploy calendar
Test shared: npm test -w shared
Lint:        npm run lint
Build:       npm run build -w client
```

## Project Structure

This is a monorepo. The existing frontend (`src/`) moves to `client/` and stays otherwise untouched. `shared/` is reorganized by league. The Edge Function lives in `functions/`. No generic `utils` or `helpers` files — every file is named after its primary export.

```
sports-calendar/                   ← repo root
├── package.json                   ← workspaces: ["shared", "client"]
├── shared/                        ← shared logic (used by both client and functions)
│   ├── package.json               ← name: @sports-calendar/shared
│   ├── tsconfig.json
│   └── src/
│       ├── espn/
│       │   ├── fetchEventRefs.ts      ← fetchEventRefsBySeason()
│       │   ├── fetchEventDetails.ts   ← fetchEventDetails<T>()
│       │   └── mapWithConcurrency.ts  ← mapWithConcurrency()
│       ├── nba/
│       │   ├── types.ts
│       │   ├── filters.ts             ← filterNbaEvents()
│       │   ├── fetch.ts               ← fetchAllNbaEvents()
│       │   └── transform.ts           ← transformNbaEventsToIcs()
│       ├── nfl/
│       │   ├── types.ts
│       │   ├── filters.ts
│       │   ├── fetch.ts
│       │   └── transform.ts
│       ├── f1/
│       │   ├── types.ts               ← F1 types + session type translation
│       │   ├── filters.ts
│       │   ├── fetch.ts
│       │   └── transform.ts
│       ├── ipl/
│       │   ├── types.ts
│       │   ├── filters.ts
│       │   ├── fetch.ts               ← date range iteration
│       │   └── transform.ts
│       ├── eventStatus.ts             ← EventStatus enum/type (cross-league)
│       └── index.ts                   ← re-exports everything
├── client/                        ← existing frontend (was src/, unchanged in content)
├── supabase/                      ← Supabase project root (required by CLI)
│   ├── config.toml                ← Supabase project config
│   └── functions/                 ← Supabase Edge Functions
│       ├── deno.json              ← maps @sports-calendar/shared to local path
│       ├── _shared/               ← function-only code (never used by client)
│       │   ├── params.ts          ← parseNbaParams(), parseNflParams() etc.
│       │   └── icsHeaders.ts      ← icsHeaders()
│       └── calendar/
│           └── index.ts           ← Hono app, all 4 routes + Deno.serve
└── ...
```

`supabase/functions/` is Deno code and is not an npm workspace. Node workspaces are `["shared", "client"]` only.

## Code Style

Match the existing frontend style (TypeScript, named exports). Hono route handlers in the Edge Function follow this pattern:

```typescript
// supabase/functions/calendar/index.ts
import { Hono } from 'npm:hono'
import { createEvents } from 'npm:ics'
import { filterNbaEvents, transformNbaEventsToIcs, fetchAllNbaEvents } from '@sports-calendar/shared'
import { parseNbaParams } from '../_shared/params.ts'
import { icsHeaders } from '../_shared/icsHeaders.ts'

const app = new Hono()

app.get('/calendar/nba.ics', async (c) => {
  const params = parseNbaParams(c.req.query())
  if (!params.ok) return c.text(params.error, 400)

  const events = await fetchAllNbaEvents()
  const filtered = filterNbaEvents(events, params.value)
  const { value: icsString, error } = createEvents(transformNbaEventsToIcs(filtered))
  if (!icsString) return c.text(`ICS generation failed: ${error}`, 500)

  return new Response(icsString, { headers: icsHeaders() })
})

Deno.serve(app.fetch)
```

Param parsing returns a discriminated union:

```typescript
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
```

The `deno.json` maps the shared package name for Deno (npm workspaces handle this automatically for Node/Vite):

```json
{ "imports": { "@sports-calendar/shared": "../../../shared/src/index.ts" } }
```

## Testing Strategy

- **Framework:** Vitest for shared package; Supabase local dev (`supabase start`) for integration tests
- **Unit tests:** Filter functions, param parsing, ICS transforms — colocated as `*.test.ts` in `shared/src/`
- **Integration tests:** Mock ESPN responses, assert valid ICS output per route — in `supabase/functions/calendar/`
- **Coverage target:** 80%+ on filter logic and param parsing; ESPN fetch adapters need smoke tests only
- **No E2E tests** this iteration

## Boundaries

- **Always:** Validate and sanitize all query params before use; never interpolate raw user strings into ESPN URLs beyond known numeric/string IDs
- **Ask first:** Adding new leagues, changing the deployment platform, adding a `supabase/config.toml` secret
- **Never:** Commit Supabase service role keys or API tokens; bypass ESPN concurrency limits (keep cap at 8)

## Success Criteria

1. Pasting `/calendar/nba.ics?teamIds=10&showPastEvents=false` into Apple Calendar's "New Calendar Subscription" shows only future games for that team.
2. Google Calendar can subscribe to the same URL and displays the same events.
3. Different filter params produce a different, valid `.ics` response.
4. The feed updates automatically in calendar clients without user action (driven by `REFRESH-INTERVAL: PT1H`).
5. A full-season NBA calendar is returned in under 10 seconds on a cold request.
6. Invalid params return HTTP 400; ESPN fetch failures surface as HTTP 502, not a 500 crash.
7. `shared/` filter logic is importable from both the frontend (`client/`) and the Edge Function without modification.
