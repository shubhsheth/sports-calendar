// Integration tests for the feed backend Hono app (ported from the original
// Deno edge-function tests to vitest). ESPN is mocked by stubbing global
// `fetch` with fixture JSON, so no network is required. The Firestore-backed
// calendar lookup is mocked away since the league / cricket-team routes never
// use it (and mocking it keeps firebase-admin out of these tests).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import nbaDetail from "./fixtures/nba.json";
import nflDetail from "./fixtures/nfl.json";
import f1Detail from "./fixtures/f1.json";
import fifaDetail from "./fixtures/fifa.json";
import iplScoreboard from "./fixtures/ipl-scoreboard.json";
import cricketHeader from "./fixtures/cricket-header.json";
import cricketSeries from "./fixtures/cricket-series-scoreboard.json";

vi.mock("./personalCalendar", () => ({
  fetchCalendarByToken: vi.fn().mockResolvedValue(null),
}));

import { app } from "./app";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

const DETAILS: Record<string, unknown> = {
  "/events/401": nbaDetail,
  "/events/501": nflDetail,
  "/events/601": f1Detail,
  "/events/801": fifaDetail,
};

const REFS: Record<string, { firstType: string; ref: string }> = {
  "/leagues/nba/": {
    firstType: "/types/2/",
    ref: "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/401",
  },
  "/leagues/nfl/": {
    firstType: "/types/1/",
    ref: "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/501",
  },
  "/leagues/f1/": {
    firstType: "/types/2/",
    ref: "https://sports.core.api.espn.com/v2/sports/racing/leagues/f1/events/601",
  },
  "/leagues/fifa.world/": {
    firstType: "/types/1/",
    ref: "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/events/801",
  },
};

const realFetch = globalThis.fetch;

function installFetchMock(): void {
  globalThis.fetch = ((input: string | URL | Request): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Cricket team discovery: serve the same multi-series header (India in
    // series 24301 only) for every sampled day/month.
    if (url.includes("/scoreboard/header")) {
      return Promise.resolve(jsonResponse(cricketHeader));
    }

    // Cricket team series scoreboard (calendar + the SL v IND Test) for
    // India's one discovered series.
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

    // NBA/NFL/F1: paginated $ref event lists. Return exactly one ref total per
    // league (page 1 of its first season type) so the loop terminates.
    if (url.includes("/seasons/") && url.includes("/events/")) {
      for (const [league, { firstType, ref }] of Object.entries(REFS)) {
        if (url.includes(league)) {
          const giveRef = url.includes(firstType) && url.includes("page=1");
          return Promise.resolve(
            jsonResponse({
              items: giveRef ? [{ $ref: ref }] : [],
              pageCount: 1,
              pageIndex: 1,
            })
          );
        }
      }
    }

    // Event detail $refs.
    for (const [suffix, detail] of Object.entries(DETAILS)) {
      if (url.endsWith(suffix)) return Promise.resolve(jsonResponse(detail));
    }

    throw new Error(`Unexpected fetch in test: ${url}`);
  }) as typeof fetch;
}

beforeEach(installFetchMock);
afterEach(() => {
  globalThis.fetch = realFetch;
});

const ROUTES = ["nba", "nfl", "f1", "ipl", "fifa"];

describe("feed backend app", () => {
  it("each league route returns valid text/calendar ICS (200)", async () => {
    for (const route of ROUTES) {
      const res = await app.request(`/calendar/${route}.ics`);
      expect(res.status, `${route}`).toBe(200);
      expect(res.headers.get("content-type") ?? "").toContain("text/calendar");

      const body = await res.text();
      for (const marker of [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:",
        "DTSTART",
      ]) {
        expect(body, `${route} missing ${marker}`).toContain(marker);
      }
    }
  });

  it("cricket-team route returns the team's matches across its series", async () => {
    const res = await app.request("/calendar/cricket-team/6.ics");
    expect(res.status).toBe(200);
    const body = await res.text();
    for (const marker of [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:",
      "DTSTART",
    ]) {
      expect(body, `missing ${marker}`).toContain(marker);
    }
    // The fixture's one India match: a multi-day Test with series context.
    expect(body).toContain("Sri Lanka v India");
    expect(body).toContain("1st Test");
    expect(body).toContain("India tour of Sri Lanka 2026");
    expect(body).toContain("DTEND");
    // The series calendar repeats the Test's match days; dedupe → one VEVENT.
    expect(body.split("BEGIN:VEVENT").length - 1).toBe(1);
  });

  it("cricket-team format filter narrows the feed", async () => {
    const kept = await app.request("/calendar/cricket-team/6.ics?formats=test");
    expect(kept.status).toBe(200);
    expect(await kept.text()).toContain("BEGIN:VEVENT");

    // Filtering to ODIs leaves no events — still a valid, empty calendar.
    const empty = await app.request("/calendar/cricket-team/6.ics?formats=odi");
    expect(empty.status).toBe(200);
    const emptyBody = await empty.text();
    expect(emptyBody).toContain("BEGIN:VCALENDAR");
    expect(emptyBody).not.toContain("BEGIN:VEVENT");
  });

  it("cricket-team route rejects bad teams and formats", async () => {
    expect((await app.request("/calendar/cricket-team/999.ics")).status).toBe(
      400
    );
    expect((await app.request("/calendar/cricket-team/foo.ics")).status).toBe(
      404
    );
    expect(
      (await app.request("/calendar/cricket-team/6.ics?formats=t10")).status
    ).toBe(400);
  });

  it("showPastEvents param is ignored, never 400, on every route", async () => {
    for (const route of ROUTES) {
      const res = await app.request(
        `/calendar/${route}.ics?showPastEvents=invalid`
      );
      expect(res.status, `${route}`).toBe(200);
    }
  });
});
