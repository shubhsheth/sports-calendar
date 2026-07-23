import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type {
  League,
  MyCalendar,
  PinnedEvent,
  SubscriptionFilters,
} from "./types";

/**
 * CRUD for the signed-in user's personal calendar, stored in Firestore under
 * `calendars/{uid}`. Ownership is the document path (uid), enforced by security
 * rules, so no user-identity filters are needed here. Document IDs carry the
 * uniqueness Postgres used to enforce: one calendar per user, one subscription
 * per league (per followed team for cricket), one pin per (league, event).
 */

function requireDb() {
  if (!db) throw new Error("Firebase is not configured");
  return db;
}

function requireUid(): string {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
}

/**
 * Subscription doc id, mirroring Postgres's `(league, team_key)` uniqueness:
 * the bare league for the single-instance leagues, `<league>__<teamId>` for a
 * followed cricket team (several may coexist).
 */
function subscriptionKey(league: League, teamId?: string): string {
  return teamId ? `${league}__${teamId}` : league;
}

/**
 * Pinned-event doc id: `<league>_<espnEventId>` (unique per league+event).
 * Cricket pin ids are `<seriesId>:<eventId>` — the colon is a legal Firestore
 * doc-id character.
 */
function pinnedKey(league: League, espnEventId: string): string {
  return `${league}_${espnEventId}`;
}

/** The user's calendar, created on first use. */
export async function getOrCreateCalendar(): Promise<{
  id: string;
  feedToken: string;
}> {
  const database = requireDb();
  const uid = requireUid();
  const ref = doc(database, "calendars", uid);

  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return { id: uid, feedToken: snapshot.get("feedToken") as string };
  }

  const feedToken = crypto.randomUUID();
  await setDoc(ref, { feedToken, createdAt: serverTimestamp() });
  return { id: uid, feedToken };
}

/** The full calendar (subscriptions + pinned events), or null before first use. */
export async function listCalendar(): Promise<MyCalendar | null> {
  const database = requireDb();
  const uid = requireUid();
  const ref = doc(database, "calendars", uid);

  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;

  const [subscriptions, pinnedEvents] = await Promise.all([
    getDocs(collection(ref, "subscriptions")),
    getDocs(collection(ref, "pinnedEvents")),
  ]);

  return {
    id: uid,
    feedToken: snapshot.get("feedToken") as string,
    subscriptions: subscriptions.docs.map(row => ({
      league: row.get("league") as League,
      filters: (row.get("filters") ?? {}) as SubscriptionFilters,
    })),
    pinnedEvents: pinnedEvents.docs.map(row => ({
      league: row.get("league") as League,
      espnEventId: row.get("espnEventId") as string,
    })),
  };
}

/**
 * Add the subscription, or replace its stored filters if already present. The
 * doc id keys leagues one-per-league and cricket teams one-per-followed-team.
 */
export async function upsertSubscription(
  league: League,
  filters: SubscriptionFilters
): Promise<void> {
  const database = requireDb();
  const { id: uid } = await getOrCreateCalendar();
  const key = subscriptionKey(league, filters.teamId);
  await setDoc(doc(database, "calendars", uid, "subscriptions", key), {
    league,
    filters,
  });
}

/**
 * Remove a subscription. `teamId` narrows the delete to one followed cricket
 * team; without it the league's own subscription doc is removed.
 */
export async function removeSubscription(
  league: League,
  teamId?: string
): Promise<void> {
  const database = requireDb();
  const uid = requireUid();
  const key = subscriptionKey(league, teamId);
  await deleteDoc(doc(database, "calendars", uid, "subscriptions", key));
}

export async function pinEvent(
  league: League,
  espnEventId: string
): Promise<void> {
  const database = requireDb();
  const { id: uid } = await getOrCreateCalendar();
  const key = pinnedKey(league, espnEventId);
  await setDoc(doc(database, "calendars", uid, "pinnedEvents", key), {
    league,
    espnEventId,
  });
}

export async function unpinEvent(
  league: League,
  espnEventId: string
): Promise<void> {
  const database = requireDb();
  const uid = requireUid();
  const key = pinnedKey(league, espnEventId);
  await deleteDoc(doc(database, "calendars", uid, "pinnedEvents", key));
}

/** Rotate the feed token, invalidating the previous feed URL. */
export async function regenerateFeedToken(): Promise<string> {
  const database = requireDb();
  const { id: uid } = await getOrCreateCalendar();
  const feedToken = crypto.randomUUID();
  await updateDoc(doc(database, "calendars", uid), { feedToken });
  return feedToken;
}

export type { League, MyCalendar, PinnedEvent, SubscriptionFilters };
