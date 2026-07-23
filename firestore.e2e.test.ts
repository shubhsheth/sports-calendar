// End-to-end read path against the Firestore emulator: seed a personal calendar
// with the exact document scheme client/api/calendar/calendarApi.ts writes, then
// let the feed function's Admin-SDK reader (functions/src/personalCalendar.ts)
// read it back. This pins the writer's and reader's field names together
// (feedToken, league, filters, espnEventId) against real Firestore — drift in
// either would break this or the calendarApi unit tests. That the *client* may
// write this scheme under the security rules is covered by firestore.rules.test.ts.
// Runs under the emulator via `npm run test:rules`.
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fetchCalendarByToken } from "./functions/src/personalCalendar";

const UID = "e2e-user";
const TOKEN = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

beforeAll(() => {
  // The Cloud Functions runtime supplies the project id; the emulator does not,
  // so pin it. db() in personalCalendar.ts reuses this app; the emulator host
  // comes from FIRESTORE_EMULATOR_HOST (set by `firebase emulators:exec`).
  if (getApps().length === 0) {
    initializeApp({ projectId: "demo-sports-calendar" });
  }
});

async function clearCalendars() {
  const db = getFirestore();
  for (const calendar of await db.collection("calendars").listDocuments()) {
    await db.recursiveDelete(calendar);
  }
}

beforeEach(clearCalendars);
afterAll(clearCalendars);

describe("personal calendar feed read (Admin SDK against the Firestore emulator)", () => {
  it("maps the calendarApi doc scheme to PersonalCalendarData, both cricket teams", async () => {
    const calendar = getFirestore().collection("calendars").doc(UID);
    // Seeded exactly as calendarApi.ts writes: calendar {feedToken}, one
    // subscription per league / cricket-team__<teamId> {league, filters}, and
    // pins {league, espnEventId} keyed <league>_<espnEventId>.
    await calendar.set({ feedToken: TOKEN });
    await calendar
      .collection("subscriptions")
      .doc("nba")
      .set({ league: "nba", filters: { teamIds: ["10"] } });
    await calendar
      .collection("subscriptions")
      .doc("cricket-team__6")
      .set({
        league: "cricket-team",
        filters: { teamId: "6", formats: ["test"] },
      });
    await calendar
      .collection("subscriptions")
      .doc("cricket-team__2")
      .set({ league: "cricket-team", filters: { teamId: "2", formats: [] } });
    await calendar
      .collection("pinnedEvents")
      .doc("ipl_701")
      .set({ league: "ipl", espnEventId: "701" });

    const data = await fetchCalendarByToken(TOKEN);
    if (!data) throw new Error("expected a calendar for the seeded token");

    expect(data.subscriptions).toHaveLength(3);
    const cricketTeamIds = data.subscriptions
      .filter(s => s.league === "cricket-team")
      .map(s => s.filters.teamId as string)
      .sort();
    expect(cricketTeamIds).toEqual(["2", "6"]);
    expect(data.pinnedEvents).toEqual([{ league: "ipl", espnEventId: "701" }]);
  });

  it("returns null for an unknown token", async () => {
    await expect(
      fetchCalendarByToken("00000000-0000-0000-0000-000000000000")
    ).resolves.toBeNull();
  });
});
