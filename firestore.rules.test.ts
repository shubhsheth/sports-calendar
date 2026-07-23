// Firestore security-rules tests. These require the Firestore emulator, so they
// run via `npm run test:rules` (which wraps `firebase emulators:exec`), NOT the
// default `npm run test:run` — the main vitest config excludes this file.
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

const ALICE = "alice";
const BOB = "bob";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-sports-calendar",
    firestore: {
      rules: readFileSync(
        new URL("./firestore.rules", import.meta.url),
        "utf8"
      ),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Firestore handle authenticated as the given uid. */
function asUser(uid: string): Firestore {
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

function unauthed(): Firestore {
  return testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
}

describe("firestore rules: calendars", () => {
  it("lets an owner create and read their calendar", async () => {
    const db = asUser(ALICE);
    await assertSucceeds(
      setDoc(doc(db, "calendars", ALICE), { feedToken: "t" })
    );
    await assertSucceeds(getDoc(doc(db, "calendars", ALICE)));
  });

  it("denies reading or writing another user's calendar", async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), "calendars", ALICE), {
        feedToken: "t",
      });
    });
    const bob = asUser(BOB);
    await assertFails(getDoc(doc(bob, "calendars", ALICE)));
    await assertFails(
      setDoc(doc(bob, "calendars", ALICE), { feedToken: "hijack" })
    );
  });

  it("denies all access to unauthenticated clients", async () => {
    const anon = unauthed();
    await assertFails(getDoc(doc(anon, "calendars", ALICE)));
    await assertFails(
      setDoc(doc(anon, "calendars", ALICE), { feedToken: "t" })
    );
  });
});

describe("firestore rules: subscriptions", () => {
  it("accepts a valid league subscription and rejects an unknown league", async () => {
    const db = asUser(ALICE);
    await assertSucceeds(
      setDoc(doc(db, "calendars", ALICE, "subscriptions", "nba"), {
        league: "nba",
        filters: { teamIds: ["10"] },
      })
    );
    await assertFails(
      setDoc(doc(db, "calendars", ALICE, "subscriptions", "mlb"), {
        league: "mlb",
        filters: {},
      })
    );
  });

  it("requires a teamId on a cricket-team subscription", async () => {
    const db = asUser(ALICE);
    await assertFails(
      setDoc(doc(db, "calendars", ALICE, "subscriptions", "cricket-team"), {
        league: "cricket-team",
        filters: { formats: ["test"] },
      })
    );
    await assertSucceeds(
      setDoc(doc(db, "calendars", ALICE, "subscriptions", "cricket-team__6"), {
        league: "cricket-team",
        filters: { teamId: "6", formats: [] },
      })
    );
  });

  it("denies writing a subscription under another user's calendar", async () => {
    const bob = asUser(BOB);
    await assertFails(
      setDoc(doc(bob, "calendars", ALICE, "subscriptions", "nba"), {
        league: "nba",
        filters: {},
      })
    );
  });

  it("lets an owner delete their own subscription", async () => {
    const db = asUser(ALICE);
    await setDoc(doc(db, "calendars", ALICE, "subscriptions", "nba"), {
      league: "nba",
      filters: {},
    });
    await assertSucceeds(
      deleteDoc(doc(db, "calendars", ALICE, "subscriptions", "nba"))
    );
  });
});

describe("firestore rules: pinnedEvents", () => {
  it("accepts a valid pin and rejects a bad league or missing id", async () => {
    const db = asUser(ALICE);
    await assertSucceeds(
      setDoc(doc(db, "calendars", ALICE, "pinnedEvents", "nba_401"), {
        league: "nba",
        espnEventId: "401",
      })
    );
    await assertFails(
      setDoc(doc(db, "calendars", ALICE, "pinnedEvents", "mlb_1"), {
        league: "mlb",
        espnEventId: "1",
      })
    );
    await assertFails(
      setDoc(doc(db, "calendars", ALICE, "pinnedEvents", "nba_x"), {
        league: "nba",
      })
    );
  });

  it("denies pinning under another user's calendar", async () => {
    const bob = asUser(BOB);
    await assertFails(
      setDoc(doc(bob, "calendars", ALICE, "pinnedEvents", "nba_401"), {
        league: "nba",
        espnEventId: "401",
      })
    );
  });
});
