# Spec: Migrate Platform from Supabase to Firebase

## Objective

Replace the app's entire platform layer — GitHub Pages hosting, Supabase Auth,
Supabase Postgres, and the Supabase Edge Function — with a single Firebase
project on the Blaze plan: Firebase Hosting (SPA + CDN), Firebase Auth (Google +
email link), Cloud Firestore (personal calendars), and Cloud Functions 2nd gen
(the `.ics` feed backend, behind a Hosting rewrite so feeds share the site's
origin). This consolidates three surfaces (GitHub Pages, Supabase, Google OAuth
console) into one, removes the `/sports-calendar/` base-path complexity, gives
feeds CDN caching, and lays the foundation for the planned stored-ESPN-events
sync layer (a future spec).

There are **no existing users**, so this is a clean cut: no user/data
migration, no feed-URL continuity shims, and Supabase is fully decommissioned
at the end.

Decision record: Firestore over Firebase Data Connect/SQL Connect (all current
and planned query patterns are satisfiable with ~5 composite indexes at ~$0/mo
vs a permanent ~$10/mo Cloud SQL floor); feeds keep fetching ESPN live in this
spec (pure port) — serving from stored data is spec 006.

Note: this spec was authored against spec-003's data model. Since then spec-004
(cricket team calendars) shipped a **teams dimension** — a `cricket-team`
"league" whose subscriptions are keyed by followed team, so a calendar may hold
several `cricket-team` subscription rows. That changes the subscription
uniqueness key and the feed backend surface this migration must reproduce; the
relevant requirements below fold it in.

## User Stories

- As a visitor, I want the site and feeds to behave exactly as they do today so
  that the platform swap is invisible.
- As a signed-in user, I want Google/email-link sign-in and my saved calendar to
  work as before so that no functionality regresses.
- As the maintainer, I want one dashboard (Firebase) for hosting, auth, data,
  and functions so that config lives in one place.
- As the maintainer, I want feeds served from my own origin with CDN caching so
  that calendar-app polls rarely hit the backend.

## Functional Requirements

- FR-1: The SPA is served by Firebase Hosting at the domain root (no
  `/sports-calendar/` base path), with SPA fallback rewrites; deep links like
  `/nba` and `/my-calendar` load correctly.
- FR-2: Users sign in with Google (popup) or an email link via Firebase Auth;
  sessions persist across reloads; sign-out works. The auth context keeps its
  current shape (`enabled/loading/user/signInWithGoogle/signInWithMagicLink/signOut`)
  so no consuming component changes.
- FR-3: Personal calendar data lives in Firestore:
  `calendars/{uid}` (`feedToken`, `createdAt`),
  `calendars/{uid}/subscriptions/{subKey}` (`league`, `filters`),
  `calendars/{uid}/pinnedEvents/{league}_{espnEventId}`. The subscription doc ID
  `subKey` mirrors Postgres's `(league, team_key)` uniqueness: it is the bare
  `league` for the single-instance leagues (nba/nfl/f1/ipl/fifa) and
  `cricket-team__<teamId>` for a followed cricket team — so a calendar holds at
  most one row per league but one row per followed team. Document IDs thereby
  enforce one-calendar-per-user, the `(calendar, league, team)` subscription
  uniqueness, and pin uniqueness. `calendarApi.ts` keeps its exported signatures
  (including `removeSubscription(league, teamId?)`, `upsertSubscription`'s
  team-aware key) so hooks and UI are untouched.
- FR-4: Firestore security rules enforce owner-only access (path-based
  `request.auth.uid == uid`), the league whitelist (nba/nfl/f1/ipl/fifa/
  cricket-team), field-shape validation on writes, and the cricket-team
  invariant (a `cricket-team` subscription must carry a `teamId`); anonymous
  clients can read/write nothing.
- FR-5: The feed backend (same Hono app: five league routes + the per-team
  `/calendar/cricket-team/<teamId>.ics` route + personal
  `/calendar/my/<token>.ics`) runs as a Cloud Functions 2nd gen HTTP function
  on Node, mounted at the site origin via a Hosting rewrite for `/calendar/**`.
  Query params, filter validation, ICS output, the cricket series-discovery
  fetch path, and the token-gated personal feed (including its cricket-team
  slice and `"<seriesId>:<eventId>"` pin ids) behave byte-equivalently. The
  personal-feed lookup reads Firestore via the Admin SDK. Responses carry CDN
  cache headers (`Cache-Control: public, max-age=300, s-maxage=3600`).
- FR-6: Feeds continue to fetch ESPN live per request (pure port — no stored
  data yet).
- FR-7: CI deploys on merge to main: Hosting (live channel), Functions, and
  Firestore rules + indexes. PRs get Hosting preview-channel deploys with the
  URL surfaced on the PR (replacing the current gh-pages PR preview).
- FR-8: The old GitHub Pages URL serves a static redirect stub pointing at the
  new origin (path-preserving where feasible); the `gh-pages` deploy workflows
  are retired.
- FR-9: Supabase is fully removed: `supabase/` directory, `@supabase/supabase-js`
  dependency, Supabase env vars, and Supabase-specific workflows are gone; docs
  reflect the Firebase architecture.
- FR-10: The anonymous experience (browse, filter, one-time `.ics` download,
  league feed subscription) is unchanged; when Firebase env config is absent
  (dev/test), account UI hides and the rest of the app works — preserving the
  current null-client pattern.

## Non-Functional Requirements

- NFR-1: Firestore rules verified by emulator tests: a user cannot read or
  write another user's calendar, subscriptions, or pins; unauthenticated access
  is denied entirely.
- NFR-2: Feed tokens remain ≥128-bit UUIDs; the personal-feed route rejects
  non-UUID tokens before any database read.
- NFR-3: Cacheable feeds: repeat GETs of the same feed URL within the
  `s-maxage` window are served by the Hosting CDN, not the function.
- NFR-4: Client bundle contains only the public Firebase web config (API key,
  authDomain, projectId — not secrets); server credentials exist only inside
  Cloud Functions (implicit Admin SDK service account).
- NFR-5: Expected steady-state cost ≤ ~$1/month at hobby scale (free-tier
  allowances persist on Blaze); a billing budget alert is part of the deploy
  checklist.

## Out of Scope

- Storing ESPN data + scheduled sync jobs + serving feeds from stored data
  (spec 006; the Firestore event model was designed in research and is not
  blocked by anything here).
- Custom domain (Hosting's `<project>.web.app` domain is fine for now; a custom
  domain can be added later without code changes).
- Migrating any Supabase users or rows (none exist).
- Keeping Supabase alive as a redirect shim for old feed URLs (no subscribers).
- Any UI/feature changes beyond the platform swap.

## Assumptions

- A Firebase project on Blaze will be created by the human (deploy checklist);
  development and verification use the Firebase Emulator Suite, which needs no
  project or credentials.
- Feed URLs become same-origin: `buildCalendarFeedUrl` defaults to
  `window.location.origin + "/calendar"`; `VITE_CALENDAR_FEED_BASE_URL` remains
  as an optional override (empty in production).
- The `shared/` workspace stays the single source of ESPN logic; the functions
  workspace consumes it via an esbuild bundle step (shared source uses
  Deno-style `.ts` extension imports, which esbuild handles).
- Firebase web config is provided via `VITE_FIREBASE_*` env vars (same
  vars-in-CI pattern as today); absence of `VITE_FIREBASE_API_KEY` disables
  account features exactly like the current Supabase null-client pattern.
- Deleting a Firebase Auth user does not cascade to Firestore; with no
  account-deletion UI in the app this is accepted and noted for a future
  cleanup trigger if account deletion is ever added.
- The `ics`/`hono`/`dayjs` versions currently pinned in the Deno import map
  carry over as npm dependencies of the functions workspace.

## Tech Stack

Existing client stack unchanged (React 19, TS 5.9, Vite 7, TanStack, Tailwind 4,
vitest). Additions/replacements:

- `firebase` v11+ (client workspace) — Auth + Firestore web SDK (modular)
- `firebase-admin` + `firebase-functions` v6 (new `functions/` workspace, Node 22)
- Hono retained in functions via Node adapter (`@hono/node-server` request listener)
- `firebase-tools` CLI (dev dependency) — emulators, deploy
- `esbuild` (functions build)
- Removed: `@supabase/supabase-js`

## Commands

```
Dev (client):          npm run dev
Build (client):        npm run build
Test:                  npm run test:run
Lint / format:         npm run lint · npm run format:check
Functions build:       npm run build --workspace functions
Emulators:             npx firebase emulators:start   (auth, firestore, functions, hosting)
Emulator tests:        npx firebase emulators:exec "npm run test:run"
Deploy (CI):           npx firebase deploy --only hosting,functions,firestore
```

## Project Structure

```
firebase.json                → Hosting (SPA + /calendar/** rewrites), emulators, targets
.firebaserc                  → project alias
firestore.rules              → owner-only security rules
firestore.indexes.json       → composite indexes (none needed yet; file scaffolded)
functions/                   → new npm workspace: the feed backend (Node 22)
├── src/index.ts             → onRequest entry wrapping the Hono app
├── src/app.ts               → Hono app (ported from supabase/functions/calendar/index.ts;
│                              incl. the /calendar/cricket-team/<teamId>.ics route)
├── src/personalFeed.ts      → combined-feed pipeline incl. the cricket-team slice (moved, unchanged logic)
├── src/personalCalendar.ts  → feed-token lookup via Admin SDK (rewritten)
├── src/params.ts, icsHeaders.ts → moved as-is (pure TS; params incl. parseCricketTeamParams)
├── src/*.test.ts            → vitest ports of the Deno tests (fixtures reused, incl. cricket-*.json)
└── esbuild.config / package.json
client/lib/firebase.ts       → web SDK singleton (null when env absent) — replaces supabase.ts
client/components/auth/      → auth-provider ported to firebase/auth
client/api/calendar/         → calendarApi.ts rewritten on Firestore, signatures unchanged
.github/workflows/           → deploy.yml + preview.yml rewritten for Firebase; deploy-functions.yml removed
spec/005-firebase-migration/ → this spec
(deleted: supabase/ entirely)
```

## Code Style

Match the repo throughout. The functions entry keeps the Hono app intact:

```ts
// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import { getRequestListener } from "@hono/node-server";
import { app } from "./app";

export const calendar = onRequest(
  { region: "us-central1" },
  getRequestListener(app.fetch)
);
```

## Testing Strategy

- Vitest everywhere (the Deno test runner goes away with `supabase/functions`);
  functions tests move into the vitest workspace with the same recorded ESPN
  fixtures and fetch stubbing.
- Firestore security rules: emulator tests with `@firebase/rules-unit-testing`
  covering owner CRUD, cross-user denial, and unauthenticated denial.
- Client auth/data layers: unit tests with mocked `firebase/auth` and
  `firebase/firestore` modules (same holder-mock pattern as today).
- End-to-end: full emulator round trip (sign in → save league + pin → fetch
  `/calendar/my/<token>.ics` through the hosting emulator) plus the existing
  headless-browser smoke script against the dev server in both env modes.

## Boundaries

- **Always:** run the CI gate (`lint`, `format:check`, `test:run`, `build`)
  before commits; keep security rules deny-by-default; keep the
  account-features-hidden-without-env behavior; validate feed tokens before DB
  reads.
- **Ask first:** new dependencies beyond those in Tech Stack; changes to the
  Firestore document model; anything that alters feed URL shapes or ICS output;
  deleting anything outside `supabase/` and the retired workflows.
- **Never:** commit service-account keys or any secret; weaken rules to make a
  test pass; remove existing client tests; change league filtering/transform
  behavior in `shared/`.

## Success Criteria

- On the emulator suite: a user signs in (Google or email link), saves two
  filtered leagues plus two followed cricket teams, pins an event, and the
  personal feed URL returns one valid ICS containing exactly the expected
  deduped events (both cricket teams' matches included, keyed by distinct
  subscription docs); removing one team leaves the other, and regenerating the
  token behaves as today (old token 404s).
- Rules tests prove cross-user and anonymous access is impossible, and that a
  `cricket-team` subscription without a `teamId` is rejected.
- All five public league feeds and the per-team
  `/calendar/cricket-team/<teamId>.ics` feed return valid ICS with identical
  query-param behavior to the current backend (same parser + feed tests pass,
  ported).
- With no Firebase env vars, the app builds, all tests pass, and the UI shows
  zero account affordances — league pages and downloads work unchanged.
- `git grep -i supabase` in source returns nothing (docs/spec history exempt);
  the client bundle contains no supabase-js code.
- CI gate green; deploy workflows validated (YAML + dry-run build of every
  artifact CI would deploy).
- Deploy checklist in implement.md covers: project creation, Blaze, provider
  enablement, authorized domains, GitHub secrets (service account), first
  deploy, Pages redirect stub, budget alert.

## Open Questions

None — direction confirmed in-session (2026-07-05): Blaze approved, hosting
moves to Firebase, Firestore over SQL Connect, clean cut with no user/URL
continuity obligations, ESPN store deferred to spec 006.
