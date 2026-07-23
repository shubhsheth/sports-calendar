// Integration tests for the personal combined feed (GET /calendar/my/:token.ics),
// ported from the Supabase Edge Function's Deno tests. ESPN is stubbed via
// global `fetch`; the Firestore calendar lookup is mocked so tests inject
// calendar contents directly (the PersonalCalendarData shape) instead of
// stubbing PostgREST.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import nbaDetail from "./fixtures/nba.json";
import iplScoreboard from "./fixtures/ipl-scoreboard.json";
import cricketHeader from "./fixtures/cricket-header.json";
import cricketSeries from "./fixtures/cricket-series-scoreboard.json";
import type { PersonalCalendarData } from "./personalCalendar";

const TOKEN = "12345678-1234-1234-1234-123456789abc";

const holder = vi.hoisted(() => ({
  calendar: null as unknown,
  lookups: 0,
}));

vi.mock("./personalCalendar", () => ({
  fetchCalendarByToken: vi.fn(async (token: string) => {
    holder.lookups++;
    return token === TOKEN ? holder.calendar : null;
  }),
}));

import { app } from "./app";

function setCalendar(data: PersonalCalendarData): void {
  holder.calendar = data;
  holder.lookups = 0;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

const realFetch = globalThis.fetch;
let headerCalls = 0;

function installFetchMock(): void {
  headerCalls = 0;
  globalThis.fetch = ((input: string | URL | Request): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes("/scoreboard/header")) {
      headerCalls++;
      return Promise.resolve(jsonResponse(cricketHeader));
    }

    if (url.includes("/cricket/24301/scoreboard")) {
      return Promise.resolve(jsonResponse(cricketSeries));
    }

    // IPL: date-range scoreboard. One event on the first season date only.
    if (url.includes("/cricket/") && url.includes("/scoreboard")) {
      const body = url.includes("dates=20260328")
        ? iplScoreboard
        : { events: [] };
      return Promise.resolve(jsonResponse(body));
    }

    // NBA: paginated $ref event list — one ref on page 1 of the first type.
    if (
      url.includes("/leagues/nba/") &&
      url.includes("/seasons/") &&
      url.includes("/events/")
    ) {
      const giveRef = url.includes("/types/2/") && url.includes("page=1");
      return Promise.resolve(
        jsonResponse({
          items: giveRef
            ? [
                {
                  $ref: "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/401",
                },
              ]
            : [],
          pageCount: 1,
          pageIndex: 1,
        })
      );
    }

    if (url.endsWith("/events/401")) {
      return Promise.resolve(jsonResponse(nbaDetail));
    }

    throw new Error(`Unexpected fetch in test: ${url}`);
  }) as typeof fetch;
}

beforeEach(installFetchMock);
afterEach(() => {
  globalThis.fetch = realFetch;
});

function uidsOf(body: string): string[] {
  return [...body.matchAll(/^UID:(.+)$/gm)].map(m => m[1].trim());
}

describe("personal combined feed", () => {
  it("malformed token 404s without a calendar lookup", async () => {
    setCalendar({ subscriptions: [], pinnedEvents: [] });
    for (const path of [
      "/calendar/my/not-a-uuid.ics",
      `/calendar/my/${TOKEN}`, // missing .ics
      "/calendar/my/1%20OR%201=1.ics",
    ]) {
      const res = await app.request(path);
      expect(res.status, path).toBe(404);
    }
    expect(holder.lookups).toBe(0);
  });

  it("unknown token returns 404", async () => {
    setCalendar({ subscriptions: [], pinnedEvents: [] });
    const res = await app.request(
      "/calendar/my/00000000-0000-0000-0000-000000000000.ics"
    );
    expect(res.status).toBe(404);
  });

  it("combines subscription and pins across leagues, deduped by UID", async () => {
    // NBA subscription filtered to team 25 (fixture event 401 matches), the
    // same NBA event also pinned (must not duplicate), plus an IPL pin with no
    // IPL subscription.
    setCalendar({
      subscriptions: [{ league: "nba", filters: { teamIds: ["25"] } }],
      pinnedEvents: [
        { league: "nba", espnEventId: "401" },
        { league: "ipl", espnEventId: "701" },
      ],
    });
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("text/calendar");
    expect(uidsOf(await res.text()).sort()).toEqual([
      "401@sports-calendar",
      "701@sports-calendar",
    ]);
  });

  it("subscription filters exclude non-matching events", async () => {
    setCalendar({
      subscriptions: [{ league: "nba", filters: { teamIds: ["99"] } }],
      pinnedEvents: [],
    });
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(uidsOf(body)).toHaveLength(0);
  });

  it("a subscription with invalid stored filters is skipped, not fatal", async () => {
    // F1 types "99" fails parseF1Params; the NBA pin must still come through.
    setCalendar({
      subscriptions: [{ league: "f1", filters: { types: ["99"] } }],
      pinnedEvents: [{ league: "nba", espnEventId: "401" }],
    });
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    expect(res.status).toBe(200);
    expect(uidsOf(await res.text())).toEqual(["401@sports-calendar"]);
  });

  it("a cricket-team subscription joins the combined feed with its format filter", async () => {
    // India (6) filtered to Tests: the fixture's SL v IND Test comes through
    // alongside an NBA pin.
    setCalendar({
      subscriptions: [
        { league: "cricket-team", filters: { teamId: "6", formats: ["test"] } },
      ],
      pinnedEvents: [{ league: "nba", espnEventId: "401" }],
    });
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(uidsOf(body).sort()).toEqual([
      "1544001@sports-calendar",
      "401@sports-calendar",
    ]);
    expect(body).toContain("India tour of Sri Lanka 2026");
  });

  it("a pinned cricket match resolves from its series without a discovery scan", async () => {
    setCalendar({
      subscriptions: [],
      pinnedEvents: [{ league: "cricket-team", espnEventId: "24301:1544001" }],
    });
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    expect(res.status).toBe(200);
    expect(uidsOf(await res.text())).toEqual(["1544001@sports-calendar"]);
    expect(headerCalls, "pin resolution must not run discovery").toBe(0);
  });

  it("a cricket pin matching a cricket subscription appears once; bad rows are skipped", async () => {
    setCalendar({
      subscriptions: [
        { league: "cricket-team", filters: { teamId: "6" } },
        // Unknown team: skipped, not fatal.
        { league: "cricket-team", filters: { teamId: "999" } },
      ],
      pinnedEvents: [
        { league: "cricket-team", espnEventId: "24301:1544001" },
        // Malformed pin id: skipped, not fatal.
        { league: "cricket-team", espnEventId: "not-composite" },
      ],
    });
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    expect(res.status).toBe(200);
    expect(uidsOf(await res.text())).toEqual(["1544001@sports-calendar"]);
  });

  it("an empty calendar returns a valid empty feed", async () => {
    setCalendar({ subscriptions: [], pinnedEvents: [] });
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(uidsOf(body)).toHaveLength(0);
  });
});
