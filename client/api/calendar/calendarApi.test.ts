import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The supabase singleton is swapped per test via this hoisted holder; the
 * module mock exposes it through a getter so each test controls the client.
 */
const holder = vi.hoisted(() => ({
  client: null as unknown,
}));

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return holder.client;
  },
}));

import {
  getOrCreateCalendar,
  listCalendar,
  pinEvent,
  regenerateFeedToken,
  removeSubscription,
  unpinEvent,
  upsertSubscription,
} from "./calendarApi";

type StubResult = { data?: unknown; error?: { message: string } | null };

/**
 * Chainable, awaitable stand-in for a supabase-js query builder: every
 * method returns the builder, awaiting it resolves with `result`.
 */
function stubQuery(result: StubResult) {
  const builder: Record<string, unknown> = {};
  for (const method of [
    "select",
    "insert",
    "upsert",
    "update",
    "delete",
    "eq",
    "maybeSingle",
    "single",
  ]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (
    onFulfilled: (value: StubResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) =>
    Promise.resolve({ error: null, ...result }).then(onFulfilled, onRejected);
  return builder as Record<
    string,
    ReturnType<typeof vi.fn> & (() => typeof builder)
  >;
}

function fakeClient(queries: ReturnType<typeof stubQuery>[], userId?: string) {
  let call = 0;
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: userId ? { user: { id: userId } } : null },
      }),
    },
    from: vi.fn(() => queries[call++]),
  };
}

const CAL_ROW = { id: "cal-1", feed_token: "token-1" };

beforeEach(() => {
  holder.client = null;
});

describe("calendarApi", () => {
  it("throws when supabase is not configured", async () => {
    await expect(listCalendar()).rejects.toThrow("Supabase is not configured");
  });

  it("throws when not signed in", async () => {
    holder.client = fakeClient([stubQuery({ data: null })]);
    await expect(listCalendar()).rejects.toThrow("Not signed in");
  });

  describe("getOrCreateCalendar", () => {
    it("returns the existing calendar", async () => {
      holder.client = fakeClient([stubQuery({ data: CAL_ROW })], "user-1");
      await expect(getOrCreateCalendar()).resolves.toEqual({
        id: "cal-1",
        feedToken: "token-1",
      });
    });

    it("creates the calendar on first use", async () => {
      const select = stubQuery({ data: null });
      const insert = stubQuery({ data: CAL_ROW });
      holder.client = fakeClient([select, insert], "user-1");

      await expect(getOrCreateCalendar()).resolves.toEqual({
        id: "cal-1",
        feedToken: "token-1",
      });
      expect(insert.insert).toHaveBeenCalledWith({ user_id: "user-1" });
    });

    it("propagates database errors", async () => {
      holder.client = fakeClient(
        [stubQuery({ data: null, error: { message: "boom" } })],
        "user-1"
      );
      await expect(getOrCreateCalendar()).rejects.toThrow("boom");
    });
  });

  describe("listCalendar", () => {
    it("returns null before first use", async () => {
      holder.client = fakeClient([stubQuery({ data: null })], "user-1");
      await expect(listCalendar()).resolves.toBeNull();
    });

    it("maps rows to the MyCalendar shape", async () => {
      holder.client = fakeClient(
        [
          stubQuery({
            data: {
              ...CAL_ROW,
              calendar_subscriptions: [
                { league: "nba", filters: { teamIds: ["10"] } },
              ],
              calendar_pinned_events: [
                { league: "ipl", espn_event_id: "401811" },
              ],
            },
          }),
        ],
        "user-1"
      );

      await expect(listCalendar()).resolves.toEqual({
        id: "cal-1",
        feedToken: "token-1",
        subscriptions: [{ league: "nba", filters: { teamIds: ["10"] } }],
        pinnedEvents: [{ league: "ipl", espnEventId: "401811" }],
      });
    });
  });

  describe("subscriptions", () => {
    it("upserts on the (calendar, league, team_key) key", async () => {
      const select = stubQuery({ data: CAL_ROW });
      const upsert = stubQuery({});
      holder.client = fakeClient([select, upsert], "user-1");

      await upsertSubscription("nba", { teamIds: ["10", "14"] });
      expect(upsert.upsert).toHaveBeenCalledWith(
        {
          calendar_id: "cal-1",
          league: "nba",
          filters: { teamIds: ["10", "14"] },
        },
        { onConflict: "calendar_id,league,team_key" }
      );
    });

    it("removes by league (RLS scopes to the own calendar)", async () => {
      const del = stubQuery({});
      holder.client = fakeClient([del], "user-1");

      await removeSubscription("f1");
      expect(del.delete).toHaveBeenCalled();
      expect(del.eq).toHaveBeenCalledWith("league", "f1");
      expect(del.eq).toHaveBeenCalledTimes(1);
    });

    it("removes one followed cricket team by team_key", async () => {
      const del = stubQuery({});
      holder.client = fakeClient([del], "user-1");

      await removeSubscription("cricket-team", "6");
      expect(del.eq).toHaveBeenCalledWith("league", "cricket-team");
      expect(del.eq).toHaveBeenCalledWith("team_key", "6");
    });
  });

  describe("pinned events", () => {
    it("pins ignoring duplicates", async () => {
      const select = stubQuery({ data: CAL_ROW });
      const upsert = stubQuery({});
      holder.client = fakeClient([select, upsert], "user-1");

      await pinEvent("ipl", "401811");
      expect(upsert.upsert).toHaveBeenCalledWith(
        { calendar_id: "cal-1", league: "ipl", espn_event_id: "401811" },
        {
          onConflict: "calendar_id,league,espn_event_id",
          ignoreDuplicates: true,
        }
      );
    });

    it("unpins by league and event id", async () => {
      const del = stubQuery({});
      holder.client = fakeClient([del], "user-1");

      await unpinEvent("ipl", "401811");
      expect(del.eq).toHaveBeenCalledWith("league", "ipl");
      expect(del.eq).toHaveBeenCalledWith("espn_event_id", "401811");
    });
  });

  it("regenerates the feed token", async () => {
    const select = stubQuery({ data: CAL_ROW });
    const update = stubQuery({ data: { feed_token: "token-2" } });
    holder.client = fakeClient([select, update], "user-1");

    await expect(regenerateFeedToken()).resolves.toBe("token-2");
    expect(update.update).toHaveBeenCalledWith({
      feed_token: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(update.eq).toHaveBeenCalledWith("id", "cal-1");
  });
});
