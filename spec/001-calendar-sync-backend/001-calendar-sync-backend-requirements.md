# Spec: Calendar Sync Backend

## Objective

Build a lightweight HTTP service (Cloudflare Worker) that generates and serves `.ics` (iCalendar) feeds for each supported sports league. The feeds are subscription URLs that Apple Calendar and Google Calendar can periodically poll, so users always see up-to-date schedules without manually re-downloading a file.

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
- **FR-4:** Set `Cache-Control: public, max-age=3600` so calendar clients and Cloudflare's edge cache the feed for 1 hour.
- **FR-5:** Each calendar event must include: title, start/end datetime, location (venue, if available), description (teams, league, status), and a stable `UID` (e.g. `{eventId}@sports-calendar`).
- **FR-6:** ESPN fetches must use the same concurrency-capped pattern (limit 8 parallel requests) as the frontend to avoid rate limiting.
- **FR-7:** IPL uses date-range iteration (2026-03-28 to 2026-06-01); NBA / NFL / F1 use paginated `$ref` fetching.
- **FR-8:** Return HTTP 400 with a plain-text error body for invalid league or malformed params.
- **FR-9:** Set the `REFRESH-INTERVAL` iCal property to `PT1H` so clients know how often to poll.
- **FR-10:** Respond to `OPTIONS` requests with appropriate CORS headers to support web-based calendar tools.

## Non-Functional Requirements

- **NFR-1:** Cold response time under 10 seconds for a full-season calendar (ESPN network fetches are the bottleneck).
- **NFR-2:** Use Cloudflare's Cache API to cache the generated `.ics` string per unique request URL for 1 hour, avoiding repeated ESPN calls on every client subscription refresh.
- **NFR-3:** `Access-Control-Allow-Origin: *` on all responses.
- **NFR-4:** No database, no auth, no user accounts — stateless except for the Cloudflare edge cache.

## Out of Scope

- User accounts or personalized/authenticated calendar URLs
- Push notifications or webhooks when events change
- Historical seasons (current season only, matching frontend)
- A UI for building subscription URLs (belongs in the frontend)
- Real-time score or status updates within the feed

## Assumptions

- Filter params are passed as query strings; no request body is needed.
- ESPN public APIs remain unauthenticated and accessible from Cloudflare's edge.
- Season IDs remain: NBA 2026, NFL 2025, F1 2026, IPL date-range 2026-03-28–2026-06-01.
- The `ics` npm package (already in the frontend) is used for ICS generation in the worker bundle.

## Tech Stack

- **Runtime:** Cloudflare Workers (V8 isolates — no Node.js built-ins)
- **Framework:** Hono (lightweight, CF Workers native, TypeScript-first)
- **ICS generation:** `ics` npm package (shared with frontend via `packages/shared`)
- **Tooling:** Wrangler v3, Vitest for tests
- **Language:** TypeScript

## Commands

```
# From repo root
Build worker:   npm run build -w packages/api
Dev worker:     npm run dev -w packages/api     # wrangler dev, local port 8787
Test:           npm test -w packages/api
Test shared:    npm test -w packages/shared
Lint:           npm run lint
Deploy:         npm run deploy -w packages/api  # wrangler deploy
```

## Project Structure

This is a monorepo. The existing frontend (`src/`) stays untouched. New packages are added alongside it.

```
sports-calendar/                   ← repo root
├── package.json                   ← workspaces: ["packages/*"]
├── packages/
│   ├── shared/                    ← shared logic (no browser/CF-specific deps)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── filters/
│   │   │   │   ├── nba.ts         ← filterNbaEvents() (adapted from frontend)
│   │   │   │   ├── nfl.ts
│   │   │   │   ├── f1.ts
│   │   │   │   └── ipl.ts
│   │   │   ├── ics/
│   │   │   │   ├── nba.ts         ← transformNbaEventsToIcs()
│   │   │   │   ├── nfl.ts
│   │   │   │   ├── f1.ts
│   │   │   │   └── ipl.ts
│   │   │   ├── types/             ← shared event + filter types
│   │   │   │   ├── base.ts
│   │   │   │   ├── nba.ts
│   │   │   │   ├── nfl.ts
│   │   │   │   ├── f1.ts
│   │   │   │   └── ipl.ts
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   └── worker/                    ← Cloudflare Worker
│       ├── package.json
│       ├── wrangler.toml
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts           ← Hono app, route registration
│       │   ├── routes/
│       │   │   ├── nba.ts
│       │   │   ├── nfl.ts
│       │   │   ├── f1.ts
│       │   │   └── ipl.ts
│       │   ├── espn/              ← ESPN fetch logic (CF fetch, no Node APIs)
│       │   │   ├── fetchEventRefs.ts
│       │   │   ├── fetchEventDetails.ts
│       │   │   └── fetchIplEvents.ts
│       │   └── params.ts          ← query param parsing + validation
│       └── test/
│           ├── routes/
│           │   ├── nba.test.ts
│           │   ├── nfl.test.ts
│           │   ├── f1.test.ts
│           │   └── ipl.test.ts
│           └── params.test.ts
├── src/                           ← existing frontend (unchanged)
├── docs/
│   └── CALENDAR_SYNC_BACKEND_SPEC.md
└── ...
```

## Code Style

Match the existing frontend style (TypeScript, named exports). Hono route handlers follow this pattern:

```typescript
// packages/api/src/routes/nba.ts
import { Hono } from "hono";
import { filterNbaEvents, transformNbaEventsToIcs } from "@sports-calendar/shared";
import { parseNbaParams } from "../params";
import { fetchAllNbaEvents } from "../espn/fetchEventRefs";
import { createEvents } from "ics";

export const nbaRoute = new Hono();

nbaRoute.get("/", async (c) => {
  const params = parseNbaParams(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  const cache = caches.default;
  const cacheKey = new Request(c.req.url);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const events = await fetchAllNbaEvents();
  const filtered = filterNbaEvents(events, params.value);
  const { value: icsString, error } = createEvents(transformNbaEventsToIcs(filtered));
  if (!icsString) return c.text(`ICS generation failed: ${error}`, 500);

  const response = new Response(icsString, { headers: icsHeaders() });
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});
```

Param parsing returns a discriminated union:

```typescript
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
```

## Testing Strategy

- **Framework:** Vitest with `@cloudflare/vitest-pool-workers` for worker tests
- **Unit tests:** Filter functions, param parsing — colocated as `*.test.ts` in `packages/shared/src/`
- **Integration tests:** Mock ESPN responses with `msw`, assert valid ICS output per route — in `packages/api/test/`
- **Coverage target:** 80%+ on filter logic and param parsing; ESPN fetch adapters need smoke tests only
- **No E2E tests** this iteration

## Boundaries

- **Always:** Validate and sanitize all query params before use; never interpolate raw user strings into ESPN URLs beyond known numeric/string IDs
- **Ask first:** Adding new leagues, switching cache backend (e.g. KV instead of Cache API), changing the deployment platform, adding a `wrangler.toml` secret
- **Never:** Commit Cloudflare account tokens or `CLOUDFLARE_API_TOKEN` values; bypass ESPN concurrency limits (keep cap at 8)

## Success Criteria

1. Pasting `/calendar/nba.ics?teamIds=10&showPastEvents=false` into Apple Calendar's "New Calendar Subscription" shows only future games for that team.
2. Google Calendar can subscribe to the same URL and displays the same events.
3. Different filter params produce a different, valid `.ics` response.
4. The feed updates automatically in calendar clients without user action (driven by `REFRESH-INTERVAL: PT1H`).
5. A full-season NBA calendar is returned in under 10 seconds on a cold (uncached) request.
6. Invalid params return HTTP 400; ESPN fetch failures surface as HTTP 502, not a 500 crash.
7. `packages/shared` filter logic is importable from both the frontend and the worker without modification.
