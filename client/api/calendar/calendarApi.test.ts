import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Unit tests for the Firestore data layer. `@/lib/firebase` (auth + db) and the
 * `firebase/firestore` functional API are mocked with a tiny in-memory store
 * keyed by document path, so these run without an emulator and assert the doc
 * paths, keys, and write ops the layer produces. Rules/behavior against a real
 * Firestore are covered by firestore.rules.test.ts (npm run test:rules).
 */
const holder = vi.hoisted(() => ({
  auth: null as { currentUser: { uid: string } | null } | null,
  db: null as unknown,
  store: new Map<string, Record<string, unknown>>(),
}));

vi.mock("@/lib/firebase", () => ({
  get auth() {
    return holder.auth;
  },
  get db() {
    return holder.db;
  },
}));

vi.mock("firebase/firestore", () => {
  type Ref = { path: string };
  const ref = (path: string): Ref => ({ path });
  return {
    doc: (_db: unknown, ...segments: string[]) => ref(segments.join("/")),
    collection: (parent: Ref, name: string) => ref(`${parent.path}/${name}`),
    getDoc: async (r: Ref) => {
      const data = holder.store.get(r.path);
      return {
        exists: () => data !== undefined,
        get: (field: string) => data?.[field],
      };
    },
    getDocs: async (r: Ref) => {
      const prefix = `${r.path}/`;
      const docs = [...holder.store.entries()]
        .filter(
          ([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/")
        )
        .map(([p, data]) => ({
          id: p.slice(prefix.length),
          get: (field: string) => data[field],
        }));
      return { docs };
    },
    setDoc: async (r: Ref, data: Record<string, unknown>) => {
      holder.store.set(r.path, data);
    },
    updateDoc: async (r: Ref, data: Record<string, unknown>) => {
      holder.store.set(r.path, { ...holder.store.get(r.path), ...data });
    },
    deleteDoc: async (r: Ref) => {
      holder.store.delete(r.path);
    },
    serverTimestamp: () => "SERVER_TS",
  };
});

import {
  getOrCreateCalendar,
  listCalendar,
  pinEvent,
  regenerateFeedToken,
  removeSubscription,
  unpinEvent,
  upsertSubscription,
} from "./calendarApi";

function signIn(uid = "user-1") {
  holder.auth = { currentUser: { uid } };
  holder.db = {};
}

beforeEach(() => {
  holder.auth = null;
  holder.db = null;
  holder.store.clear();
});

describe("calendarApi (Firestore)", () => {
  it("throws when Firebase is not configured", async () => {
    holder.auth = { currentUser: { uid: "user-1" } };
    await expect(listCalendar()).rejects.toThrow("Firebase is not configured");
  });

  it("throws when not signed in", async () => {
    holder.db = {};
    await expect(listCalendar()).rejects.toThrow("Not signed in");
  });

  describe("getOrCreateCalendar", () => {
    it("creates the calendar doc at calendars/{uid} on first use", async () => {
      signIn();
      const result = await getOrCreateCalendar();
      expect(result.id).toBe("user-1");
      expect(result.feedToken).toMatch(/^[0-9a-f-]{36}$/);
      const stored = holder.store.get("calendars/user-1");
      expect(stored?.feedToken).toBe(result.feedToken);
      expect(stored?.createdAt).toBe("SERVER_TS");
    });

    it("returns the existing calendar without overwriting", async () => {
      signIn();
      holder.store.set("calendars/user-1", { feedToken: "existing" });
      await expect(getOrCreateCalendar()).resolves.toEqual({
        id: "user-1",
        feedToken: "existing",
      });
    });
  });

  describe("listCalendar", () => {
    it("returns null before first use", async () => {
      signIn();
      await expect(listCalendar()).resolves.toBeNull();
    });

    it("maps the calendar and its subcollections", async () => {
      signIn();
      holder.store.set("calendars/user-1", { feedToken: "token-1" });
      holder.store.set("calendars/user-1/subscriptions/nba", {
        league: "nba",
        filters: { teamIds: ["10"] },
      });
      holder.store.set("calendars/user-1/subscriptions/cricket-team__6", {
        league: "cricket-team",
        filters: { teamId: "6", formats: [] },
      });
      holder.store.set("calendars/user-1/pinnedEvents/ipl_701", {
        league: "ipl",
        espnEventId: "701",
      });

      await expect(listCalendar()).resolves.toEqual({
        id: "user-1",
        feedToken: "token-1",
        subscriptions: [
          { league: "nba", filters: { teamIds: ["10"] } },
          { league: "cricket-team", filters: { teamId: "6", formats: [] } },
        ],
        pinnedEvents: [{ league: "ipl", espnEventId: "701" }],
      });
    });
  });

  describe("subscriptions", () => {
    it("upserts a league at subscriptions/{league}", async () => {
      signIn();
      await upsertSubscription("nba", { teamIds: ["10", "14"] });
      expect(holder.store.get("calendars/user-1/subscriptions/nba")).toEqual({
        league: "nba",
        filters: { teamIds: ["10", "14"] },
      });
    });

    it("keys a cricket-team subscription by followed team", async () => {
      signIn();
      await upsertSubscription("cricket-team", { teamId: "6", formats: [] });
      await upsertSubscription("cricket-team", { teamId: "2", formats: [] });
      expect(
        holder.store.has("calendars/user-1/subscriptions/cricket-team__6")
      ).toBe(true);
      expect(
        holder.store.has("calendars/user-1/subscriptions/cricket-team__2")
      ).toBe(true);
    });

    it("removes a league subscription by its doc", async () => {
      signIn();
      holder.store.set("calendars/user-1/subscriptions/f1", { league: "f1" });
      await removeSubscription("f1");
      expect(holder.store.has("calendars/user-1/subscriptions/f1")).toBe(false);
    });

    it("removes only the named cricket team, leaving others", async () => {
      signIn();
      holder.store.set("calendars/user-1/subscriptions/cricket-team__6", {
        league: "cricket-team",
      });
      holder.store.set("calendars/user-1/subscriptions/cricket-team__2", {
        league: "cricket-team",
      });
      await removeSubscription("cricket-team", "6");
      expect(
        holder.store.has("calendars/user-1/subscriptions/cricket-team__6")
      ).toBe(false);
      expect(
        holder.store.has("calendars/user-1/subscriptions/cricket-team__2")
      ).toBe(true);
    });
  });

  describe("pinned events", () => {
    it("pins at pinnedEvents/{league}_{eventId}", async () => {
      signIn();
      await pinEvent("ipl", "401811");
      expect(
        holder.store.get("calendars/user-1/pinnedEvents/ipl_401811")
      ).toEqual({ league: "ipl", espnEventId: "401811" });
    });

    it("keeps the colon in a cricket pin id", async () => {
      signIn();
      await pinEvent("cricket-team", "24301:1544001");
      expect(
        holder.store.has(
          "calendars/user-1/pinnedEvents/cricket-team_24301:1544001"
        )
      ).toBe(true);
    });

    it("unpins by league and event id", async () => {
      signIn();
      holder.store.set("calendars/user-1/pinnedEvents/ipl_401811", {
        league: "ipl",
        espnEventId: "401811",
      });
      await unpinEvent("ipl", "401811");
      expect(holder.store.has("calendars/user-1/pinnedEvents/ipl_401811")).toBe(
        false
      );
    });
  });

  it("regenerates the feed token", async () => {
    signIn();
    holder.store.set("calendars/user-1", { feedToken: "token-1" });
    const next = await regenerateFeedToken();
    expect(next).toMatch(/^[0-9a-f-]{36}$/);
    expect(next).not.toBe("token-1");
    expect(holder.store.get("calendars/user-1")?.feedToken).toBe(next);
  });
});
