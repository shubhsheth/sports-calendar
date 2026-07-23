# Tasks: Migrate Platform from Supabase to Firebase

Each task ends in a compiling, testable state. CI gate after each:
`npm run lint && npm run format:check && npm run test:run && npm run build`.
Tasks touching Firebase behavior additionally verify against the Emulator Suite
(`npx firebase emulators:start` / `emulators:exec`). Supabase code keeps working
until T7 removes it — the two stacks coexist mid-migration.

- [x] **T1 — Firebase scaffolding + emulators.** Add `firebase-tools` (dev dep),
  `firebase.json` (hosting `public: dist`, SPA rewrite, `/calendar/**` →
  function `calendar` rewrite ordered first; emulator ports for auth,
  firestore, functions, hosting), `.firebaserc` (project placeholder),
  `firestore.rules` (deny-all placeholder), `firestore.indexes.json` (empty).
  Verify: emulator suite boots locally (note: Firestore emulator needs a JVM —
  record the sandbox's capability in implement.md and fall back to
  rules-unit-testing-only verification if absent).

- [ ] **T2 — Functions workspace (pure port, still ESPN-live).** New
  `functions/` npm workspace (Node 22): move `params.ts`, `icsHeaders.ts`,
  `personalFeed.ts`, and the Hono app from `supabase/functions/` (imports
  repointed; `Deno.serve` → `onRequest` + `@hono/node-server` request
  listener). The app includes the five league routes **and** the
  `/calendar/cricket-team/<teamId>.ics` route (numeric-id gate + series
  discovery); `personalFeed.ts` includes the cricket-team slice (multiple
  per-team subscriptions, `"<seriesId>:<eventId>"` pin ids). Rewrite
  `personalCalendar.ts` on the Admin SDK
  (`calendars.where("feedToken","==",token).limit(1)` + subcollection reads);
  add CDN cache headers to `icsHeaders`. esbuild bundle step that inlines
  `@sports-calendar/shared` (Deno-style `.ts` imports; incl. the `cricketTeam`
  module + discovery). Port the Deno test files to vitest (reuse `fixtures/`,
  incl. `cricket-header.json` / `cricket-series-scoreboard.json`; stub fetch +
  Firestore lookup). Leave `supabase/functions` untouched for now. Verify:
  vitest green including ported league + cricket-team + personal-feed tests;
  bundle builds.

- [ ] **T3 — Firestore rules + data layer.** Write real `firestore.rules`
  (path-based owner-only for `calendars/{uid}` and subcollections; league
  whitelist incl. `cricket-team`; field checks incl. the cricket-team invariant
  that a `cricket-team` subscription carries a string `teamId`); rules tests via
  `@firebase/rules-unit-testing`. Rewrite `client/api/calendar/calendarApi.ts`
  on `firebase/firestore` with unchanged exported signatures — the subscription
  doc ID is `league` for single-instance leagues and `cricket-team__<teamId>`
  for followed teams (mirrors the `(league, team_key)` unique key);
  `upsertSubscription` computes that id; `removeSubscription(league, teamId?)`
  deletes the exact doc (`teamId` present → the one team's doc; absent → the
  league doc); no reliance on RLS-style implicit scoping; `regenerateFeedToken`
  still client-generated UUID. Update `calendarApi.test.ts` mocks (incl. a
  cricket-team add/remove case). Verify: CI gate + rules tests green.

- [ ] **T4 — Client auth swap.** `client/lib/firebase.ts` singleton from
  `VITE_FIREBASE_*` (null when absent — same feature-off pattern; delete-safe
  alongside supabase.ts until T7). Port `auth-provider.tsx` to `firebase/auth`:
  `onAuthStateChanged`, `signInWithPopup(GoogleAuthProvider)`,
  `sendSignInLinkToEmail` + `isSignInWithEmailLink`/`signInWithEmailLink`
  completion on app load (email stored in localStorage), `signOut`. `useAuth.ts`
  swaps the `User` type. Update auth tests. Verify: CI gate green; emulator
  smoke sign-in (auth emulator) if JVM available.

- [ ] **T5 — Hosting cutover in the client.** Remove the base path: vite
  `base: "/"` unconditionally, drop `VITE_BASE_PATH` plumbing, `redirectUrl()`
  simplification, delete the `404.html` copy step from the build script.
  `buildCalendarFeedUrl` defaults to same-origin `/calendar` (env override
  retained). Update `.env.example` (`VITE_FIREBASE_*` in, Supabase vars out).
  Verify: CI gate green; headless-browser smoke (both env modes) against dev
  server; `npm run preview` serves deep links.

- [ ] **T6 — CI/CD rewrite.** `deploy.yml`: build → `firebase deploy --only
  hosting,functions,firestore` via `FirebaseExtended/action-hosting-deploy` +
  CLI (service-account secret `FIREBASE_SERVICE_ACCOUNT`); `preview.yml`:
  Hosting preview channels with PR comment; delete `deploy-functions.yml`;
  one-time workflow/commit that replaces `gh-pages` content with the redirect
  stub to the new origin. Verify: YAML validates; every artifact CI deploys
  builds locally (`npm run build`, functions bundle, rules compile via
  emulator).

- [ ] **T7 — Decommission Supabase.** Delete `supabase/` and
  `client/lib/supabase.ts`; remove `@supabase/supabase-js`; purge
  `VITE_SUPABASE_*` references; `git grep -i supabase` clean in source. Update
  `docs/PROJECT_OVERVIEW.md` + rewrite `docs/BACKEND.md` for the Firebase
  architecture; note the Supabase project itself can be paused/deleted in the
  deploy checklist. Verify: CI gate green; grep clean.

- [ ] **T8 — Full verification.** CI gate + all vitest suites green. Emulator
  end-to-end: sign in → save two leagues + two cricket teams + pin → personal
  feed through the hosting emulator returns combined deduped ICS (both teams
  present) → remove one team leaves the other → remove/regenerate behaves →
  per-team `/calendar/cricket-team/<teamId>.ics` returns valid ICS →
  cross-user rules test suite green. Headless smoke both env modes. Record the
  deploy checklist (create project, Blaze, enable Google + email-link,
  authorized domains incl. localhost, `FIREBASE_SERVICE_ACCOUNT` secret +
  `VITE_FIREBASE_*` repo vars, first deploy, verify live feeds in a real
  calendar app, gh-pages stub, billing alert at $5, pause Supabase project) in
  implement.md.
