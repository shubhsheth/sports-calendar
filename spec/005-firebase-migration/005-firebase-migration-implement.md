# Implement: Migrate Platform from Supabase to Firebase

Execution log for the SPECIFY → TASKS → IMPLEMENT workflow. Tasks are defined in
`005-firebase-migration-tasks.md`. Work one task at a time; check it off here
and in tasks.md after the human approves the increment.

## Conventions
- CI gate = `npm run lint && npm run format:check && npm run test:run && npm run build`.
- Emulators: `npx firebase emulators:start` (dev) /
  `npx firebase emulators:exec "<cmd>"` (tests). No real Firebase project is
  needed until the deploy checklist.
- Client imports: named exports, `@/` alias; shared ESPN logic only from
  `@sports-calendar/shared`; keep `calendarApi.ts` and `useAuth` signatures
  frozen so hooks/UI don't churn.
- The two stacks coexist until T7; the app must build and pass tests at every
  task boundary with Supabase still wired wherever Firebase hasn't replaced it
  yet.

## Reference (verified during planning — see spec 005 research, 2026-07-05)
- Audit: auth surface = `client/lib/supabase.ts`, `auth-provider.tsx`,
  `useAuth.ts` type, `calendarApi.ts#requireUserId`, 2 test files. All DB
  access in `calendarApi.ts`. Backend Deno-specific surface: `Deno.serve` line,
  `Deno.env` in `personalCalendar.ts` (full rewrite), deno.json import map;
  Hono/params/personalFeed/icsHeaders are pure TS. Deno tests: `index.test.ts`,
  `my-feed.test.ts`, `_shared/params.test.ts` + `calendar/fixtures/`.
- **Teams dimension (spec-004 cricket-team, merged after this spec was drafted).**
  Migration `20260719000000_cricket_team_subscriptions.sql`: league whitelist is
  now 6 values incl. `cricket-team`; subscription uniqueness moved to
  `(calendar_id, league, team_key)` where `team_key` is a stored generated column
  = `coalesce(filters->>'teamId','')`; a CHECK requires cricket-team rows to have
  `filters->>'teamId'`. So the Firestore subscription doc ID is `league` for the
  single-instance leagues and `cricket-team__<teamId>` for a followed team
  (`team_key` empty → league-only id preserves one-per-league). `calendarApi.ts`
  now takes `removeSubscription(league, teamId?)` and upserts on
  `calendar_id,league,team_key`. Backend adds `/calendar/cricket-team/:file`
  (`<teamId>.ics`, numeric gate, series-discovery fetch — no fixed season) and a
  cricket-team slice in `personalFeed.ts`; cricket **pins** store
  `"<seriesId>:<eventId>"` (not a bare id). Shared code: `shared/src/cricketTeam/*`
  (discovery/fetch/filters/transform/types) + `parseCricketTeamParams`. New
  fixtures `cricket-header.json`, `cricket-series-scoreboard.json`. All of it is
  pure TS and ports the same way; the esbuild bundle must include the cricketTeam
  module + discovery.
- Two client deletes (`removeSubscription`, `unpinEvent`) currently rely on RLS
  for user scoping — the Firestore rewrite MUST address exact doc paths under
  `calendars/{uid}`; this is the highest-risk correctness point of the port.
  (The team-aware `removeSubscription` deleting an exact subscription doc is
  actually cleaner in Firestore than the Postgres `.eq("team_key", …)` filter.)
- Firestore doc-ID model gives every Postgres unique constraint for free:
  `calendars/{uid}`, `subscriptions/{league | cricket-team__<teamId>}`,
  `pinnedEvents/{league}_{eventId}` (cricket pin ids contain a colon —
  `cricket-team_<seriesId>:<eventId>` — which is a legal Firestore doc-ID char).
  Feed-token lookup is a single-field auto-indexed query (Admin SDK bypasses
  rules). No composite indexes needed in this spec.
- Email-link auth needs a completion path on app load
  (`isSignInWithEmailLink(window.location.href)`) — a genuinely new code path
  vs supabase-js's automatic URL-session detection.
- Firestore emulator requires a JVM; check `java -version` in the sandbox at T1
  and record the fallback (rules-unit-testing still needs the emulator — if no
  JVM, install a JRE or scope rules verification to the deploy checklist).
- Hosting rewrites: order matters (`/calendar/**` before the SPA `**` rewrite);
  Hosting imposes a hard 60s timeout on rewritten function calls; CDN caches
  per URL+query only for GET/HEAD when `s-maxage` is set; deploys purge the CDN.
- Costs: free allowances persist on Blaze; expected ~$0-1/mo for this spec
  (no sync jobs yet).

## Progress
- [x] T1 — Firebase scaffolding + emulators
- [x] T2 — Functions workspace (pure port)
- [x] T3 — Firestore rules + data layer
- [x] T4 — Client auth swap
- [x] T5 — Hosting cutover in the client
- [x] T6 — CI/CD rewrite
- [x] T7 — Decommission Supabase
- [ ] T8 — Full verification

## Notes
- **T1 (done):** Sandbox has OpenJDK 21, so the Firestore emulator runs here —
  no JVM fallback needed; rules tests (T3) can run in-sandbox. `firebase-tools`
  15.24.0. Emulator suite boots via
  `npx firebase emulators:exec --only firestore,auth --project demo-sports-calendar`.
  Using the `demo-` project prefix keeps emulators/CI fully offline (no real
  credentials); the real project id is supplied at deploy time (T6/checklist),
  not committed. Harmless `::1` (IPv6-unavailable) warnings in this sandbox
  only; emulators bind 127.0.0.1 fine. Top-level `emulators.host` config key is
  ineffective (doesn't reach the internal hub/logging emulators), so it was not
  added — the warnings are cosmetic.

- **T2 (done):** New `functions/` npm workspace (added to root `workspaces`),
  Node 22. Ported `app.ts` (Hono app, `Deno.serve` dropped — `index.ts` wraps it
  with `onRequest` + `@hono/node-server` `getRequestListener`), `params.ts`/
  `icsHeaders.ts`/`personalFeed.ts` (copies, relative `.ts` imports → extensionless),
  and `personalCalendar.ts` rewritten on `firebase-admin/firestore`
  (`collection("calendars").where("feedToken","==",token).limit(1)` +
  subcollection reads; Firestore initialized lazily so importing the module never
  needs Admin creds). `icsHeaders` now emits `max-age=300, s-maxage=3600` (CDN).
  Bundle: `esbuild.mjs` → CJS `lib/index.js` (278 kB), inlining shared/hono/ics/
  dayjs, externalizing firebase-admin/functions (Firebase runtime provides them).
  Decisions: (a) **CJS** output (no `type:module` in functions/package.json) —
  safest for Cloud Functions + CJS firebase-admin/functions externals; esbuild.mjs
  is `.mjs` so it runs as ESM regardless. (b) Tests **mock `./personalCalendar`**
  (`vi.mock`) so firebase-admin never loads in vitest and the my-feed tests inject
  `PersonalCalendarData` directly instead of stubbing PostgREST. (c) Fixtures
  imported as JSON modules (vite resolves them) — `new URL(import.meta.url)`
  filesystem resolution misbehaves under vitest. 26 functions tests (app routes,
  cricket-team, personal-feed combine/dedupe/skip, params) run in the root suite
  (252 → 278). Added `functions/tsconfig.json` (eslint project service) and
  `functions/lib` to eslint ignores. Real cloud deploy + emulator function-load
  deferred to T6/T8.

- **T3 (done):** Real `firestore.rules` (owner-only via the `calendars/{uid}`
  path; write-time league whitelist + `filters is map` + cricket-team `teamId is
  string` invariant; deny-by-default). `calendarApi.ts` rewritten on
  `firebase/firestore`, signatures frozen. Doc-ID model: calendar = `calendars/{uid}`
  (id returned = uid; `MyCalendar.id` is only ever read as an opaque string —
  no consumer depends on the old separate uuid); subscription id = `league` or
  `<league>__<teamId>`; pin id = `<league>_<espnEventId>`. The RLS-reliant deletes
  now address exact doc paths — the highest-risk item, verified by the rules
  tests (cross-user + anon denied) and unit tests (correct paths/keys).
- **Minor within-spec reorder:** `client/lib/firebase.ts` (the null-guarded
  app + `auth`/`db` singletons) was created in T3, not T4 — the data layer needs
  `db`/`auth` and both auth (T4) and data share one initialized app. Noted so
  T4's summary reflects it (T4 now only adds the auth *provider*, not the lib).
- **removeSubscription semantics:** the Firestore version deletes the exact
  subscription doc. `removeSubscription("cricket-team")` with **no** teamId would
  target a non-existent `subscriptions/cricket-team` doc (a no-op), unlike
  Postgres which deleted every cricket row. No caller does this — the My Calendar
  page always passes `subscription.filters.teamId` (undefined for leagues, the id
  for cricket), so behavior is identical for real call sites.
- **Rules-test infra:** `firestore.rules.test.ts` (@firebase/rules-unit-testing)
  runs via `npm run test:rules` = `firebase emulators:exec --only firestore …
  "vitest run --config vitest.rules.config.ts"`. It's excluded from the default
  `npm run test:run` (needs the emulator) and added to `tsconfig.node.json` for
  the eslint project service. All 9 rules tests green in-sandbox (OpenJDK 21).
  Client unit tests: 14 (in-memory Firestore mock). Full suite 278 → 279.
- **Coexistence note:** between T3 and T4 the AuthProvider still uses Supabase,
  so `auth.currentUser` (Firebase) is null and calendarApi would throw "Not
  signed in" if called — but account UI is env-gated (hidden without
  `VITE_FIREBASE_*`), and nothing is deployed until T6, so no live impact. T4
  makes Firebase the actual sign-in.

- **T4 (done):** `auth-provider.tsx` ported to `firebase/auth`:
  `onAuthStateChanged` (returns the unsubscribe directly),
  `signInWithPopup(GoogleAuthProvider)`, `sendSignInLinkToEmail` + the on-load
  `isSignInWithEmailLink`/`signInWithEmailLink` completion path (email stashed in
  localStorage; URL cleaned via `history.replaceState`), and `signOut`.
  `useAuth.ts` `User` type now from `firebase/auth`; `enabled = auth !== null`.
  `client/lib/firebase.ts` already existed (T3), so T4 only touched the provider,
  hook type, and test. Auth-emulator live sign-in smoke deferred to T8 (the web
  SDK talks to real Firebase unless `connectAuthEmulator` is wired; unit tests
  cover the provider logic). Suite 279 → 281.

- **T5 (done):** vite `base: "/"` (was the `/sports-calendar/` production
  default); build script drops the `cp dist/index.html dist/404.html` step
  (Firebase Hosting's SPA rewrite handles fallback). `buildCalendarFeedUrl`
  defaults to `${window.location.origin}/calendar` (env override via
  `||`); the one feed-URL test (cricket) updated to the origin-based
  expectation. `.env.example`: `VITE_FIREBASE_*` in, Supabase vars out.
  Verified: built `dist/index.html` references `/assets/...` (no
  `/sports-calendar/` anywhere), no `404.html` emitted, `/my-calendar` deep
  link serves 200, headless smoke with dummy `VITE_FIREBASE_*` passes (Sign in
  button present, all league pages render at root, zero console errors — one
  pre-existing FIFA ESPN-fetch-timeout flake, unrelated). Suite still 281.
  **Sequencing note:** `VITE_BASE_PATH` is now unused by `vite.config.ts` but
  `preview.yml` still passes it (harmless no-op); T6 removes it from the
  workflow. If a PR preview runs in the T5→T6 window its assets resolve at
  root (visually off under the gh-pages subpath) but the build itself is green.

- **T6 (done):** `deploy.yml` → Firebase: build client + functions bundle, then
  `firebase deploy --only hosting,functions,firestore` via the CLI with a
  service-account file (`FIREBASE_SERVICE_ACCOUNT` secret →
  `GOOGLE_APPLICATION_CREDENTIALS`). `preview.yml` → per-PR Firebase Hosting
  preview channels via `FirebaseExtended/action-hosting-deploy` (auto PR
  comment). `deploy-functions.yml` deleted (Supabase). Both deploy steps are
  guarded `if: vars.FIREBASE_PROJECT_ID != ''` — so until the maintainer sets
  that repo variable (deploy checklist), the lint/test/build gate still runs on
  every push/PR and the deploy is *skipped*, keeping CI green pre-config; it
  activates automatically once the var is set. `VITE_BASE_PATH` removed from
  workflows; Node bumped 20 → 22 (functions runtime).
  - **firebase.json** gained a `functions` block: `source: functions`,
    `runtime: nodejs22`, `predeploy` runs the esbuild bundle, `ignore` excludes
    `src`/`node_modules`/config so only the bundled `lib/` + `package.json` ship.
    The `/calendar/**` rewrite now targets `{functionId: calendar, region:
    us-central1}` (Gen2 form).
  - **functions/package.json** split so the cloud prod-install pulls only the
    runtime externals: `dependencies` = firebase-admin + firebase-functions;
    everything bundled (shared, hono, @hono/node-server, ics, dayjs) + esbuild/
    express → `devDependencies`. Verified the bundle still `require()`s only
    `firebase-admin/*` and `firebase-functions/*`.
  - **Validation:** workflows + firebase.json parse; the **functions emulator
    loads the bundled `calendar` HTTP function** ("Loaded functions definitions
    from source: calendar", node@22) — de-risks the real deploy and T8. CI gate
    green (281 tests).
  - **gh-pages redirect stub:** `scripts/gh-pages-stub/{index.html,404.html,README.md}`
    — path-preserving client redirect with a `__FIREBASE_URL__` placeholder the
    maintainer fills and publishes to the `gh-pages` branch at deploy time
    (checklist). Not auto-published because the target URL isn't known until the
    project exists.

- **T7 (done):** Deleted `supabase/` entirely and `client/lib/supabase.ts`;
  removed `@supabase/supabase-js`. `git grep -i supabase` is now clean outside
  `spec/` (the migration record) and `package-lock.json`. **Fixture relocation:**
  two shared tests (`shared/src/cricketTeam/{fetch,discovery}.test.ts`) imported
  cricket fixtures from `supabase/functions/calendar/fixtures/`, so those three
  JSON files moved to `shared/src/cricketTeam/fixtures/` and the imports were
  repointed — otherwise deleting `supabase/` would have broken shared. Cleaned
  the now-dangling config refs (`eslint.config.js`, `.prettierignore`,
  `vite.config.ts` test-exclude) and reworded comments that named Supabase
  (auth-provider/menu, functions tests). Rewrote `docs/BACKEND.md` for the
  Firebase architecture (Functions + Firestore model + rules + Auth + emulators
  + deploy) and updated `docs/PROJECT_OVERVIEW.md` and `README.md`. Test count
  269 (was 281): the −12 is the duplicate `supabase/_shared/params.test.ts`,
  identical to `functions/src/params.test.ts` which remains — no lost coverage.
  The real Supabase project can be paused/deleted by the maintainer (T8 deploy
  checklist).

(more notes below as tasks land; deploy checklist lands here at T8)
