/**
 * Service-role lookup of a personal calendar by its secret feed token.
 *
 * Runs inside the Cloud Function with the Admin SDK, which bypasses Firestore
 * security rules — feed URLs are fetched by calendar apps that can't
 * authenticate. Firestore is initialized lazily so merely importing this module
 * (e.g. from the league-route tests) never touches Admin credentials.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export type StoredFilters = {
  teamIds?: unknown;
  types?: unknown;
  teamId?: unknown; // cricket-team rows: the followed team
  formats?: unknown; // cricket-team rows: match-format filter
};

export type PersonalCalendarData = {
  subscriptions: { league: string; filters: StoredFilters }[];
  pinnedEvents: { league: string; espnEventId: string }[];
};

function db(): Firestore {
  if (getApps().length === 0) initializeApp();
  return getFirestore();
}

export async function fetchCalendarByToken(
  token: string
): Promise<PersonalCalendarData | null> {
  const snapshot = await db()
    .collection("calendars")
    .where("feedToken", "==", token)
    .limit(1)
    .get();
  if (snapshot.empty) return null;

  const calendar = snapshot.docs[0].ref;
  const [subscriptions, pinnedEvents] = await Promise.all([
    calendar.collection("subscriptions").get(),
    calendar.collection("pinnedEvents").get(),
  ]);

  return {
    subscriptions: subscriptions.docs.map(doc => ({
      league: doc.get("league") as string,
      filters: (doc.get("filters") ?? {}) as StoredFilters,
    })),
    pinnedEvents: pinnedEvents.docs.map(doc => ({
      league: doc.get("league") as string,
      espnEventId: doc.get("espnEventId") as string,
    })),
  };
}
