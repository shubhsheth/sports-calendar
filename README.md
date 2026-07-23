# Sports Calendar

A live calendar for your favorite sports leagues. Browse fixtures
with infinite scroll and filtering, export them as an `.ics` file, or **subscribe
to an auto-updating feed** in Apple Calendar or Google Calendar.

Signed-in users get a personal calendar: subscribe to filtered leagues, follow
cricket teams, and pin individual games into one combined feed.

Schedule data comes from ESPN's unofficial Core/Site APIs (see
[`docs/ESPN_API.md`](docs/ESPN_API.md)).

## Repository layout

This is an npm-workspaces monorepo:

| Workspace / dir | Purpose |
|-----------------|---------|
| `client/`       | React + TypeScript + Vite SPA (deployed to Firebase Hosting) |
| `shared/`       | `@sports-calendar/shared` — ESPN fetch primitives and per-league types/filters/transforms shared by the client and the backend |
| `functions/`    | Cloud Functions (Hono on Node) that serve the live `.ics` subscription feeds |

## Getting started

```bash
npm install        # install all workspaces
npm run dev        # start the Vite dev server (client)
npm run test:run   # run the test suite once
npm run lint       # lint the monorepo
```

Copy `.env.example` to `.env` and fill in the optional PostHog, calendar-feed,
and Firebase variables as needed. Without the Firebase variables the account
features hide and the anonymous app works unchanged.

For the calendar-feed backend (local dev and deploy), see
[`docs/BACKEND.md`](docs/BACKEND.md).

## Documentation

| File | Description |
|------|-------------|
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | Architecture, tech stack, directory structure, and core patterns |
| [`docs/ESPN_API.md`](docs/ESPN_API.md) | ESPN Core/Site API reference — endpoints, `$ref` pattern, per-league event structures, ICS mapping |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Cloud Functions feed backend + Firestore/Auth — endpoints, data model, local dev, and deploy |
