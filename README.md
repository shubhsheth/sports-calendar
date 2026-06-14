# Sports Calendar

A live calendar for **NBA, NFL, Formula 1, and IPL** schedules. Browse fixtures
with infinite scroll and filtering, export them as an `.ics` file, or **subscribe
to an auto-updating feed** in Apple Calendar or Google Calendar.

Live: https://shubhsheth.github.io/sports-calendar/

Schedule data comes from ESPN's unofficial Core/Site APIs (see
[`docs/ESPN_API.md`](docs/ESPN_API.md)).

## Repository layout

This is an npm-workspaces monorepo:

| Workspace / dir | Purpose |
|-----------------|---------|
| `client/`       | React + TypeScript + Vite SPA (deployed to GitHub Pages) |
| `shared/`       | `@sports-calendar/shared` — ESPN fetch primitives and per-league types/filters/transforms shared by the client and the backend |
| `supabase/`     | Supabase Edge Function (Hono on Deno) that serves the live `.ics` subscription feeds |

## Getting started

```bash
npm install        # install all workspaces
npm run dev        # start the Vite dev server (client)
npm run test:run   # run the test suite once
npm run lint       # lint the monorepo
```

Copy `.env.example` to `.env` and fill in the optional PostHog and calendar-feed
variables as needed.

For the calendar-feed backend (local dev and deploy), see
[`docs/BACKEND.md`](docs/BACKEND.md).

## Documentation

| File | Description |
|------|-------------|
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | Architecture, tech stack, directory structure, and core patterns |
| [`docs/ESPN_API.md`](docs/ESPN_API.md) | ESPN Core/Site API reference — endpoints, `$ref` pattern, per-league event structures, ICS mapping |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Supabase Edge Function — calendar feed endpoints, local dev, and deploy |
