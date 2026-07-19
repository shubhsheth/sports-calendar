import { afterAll, afterEach, beforeAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  fetchAllCricketTeamEvents,
  fetchSeriesCalendar,
  fetchSeriesEventsByDate,
} from "./fetch.ts";
// Real (trimmed) fixtures: India tour of Sri Lanka (multi-day 1st Test, whose
// calendar lists each Test match day) and WI tour of India (dated 1st ODI).
import seriesFixture from "../../../supabase/functions/calendar/fixtures/cricket-series-scoreboard.json";
import odiFixture from "../../../supabase/functions/calendar/fixtures/cricket-odi-scoreboard.json";
// Header fixture drives discovery inside fetchAllCricketTeamEvents: India (6)
// appears only in series 24301.
import headerFixture from "../../../supabase/functions/calendar/fixtures/cricket-header.json";

const HEADER_URL =
  "https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header";
const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/cricket/:seriesId/scoreboard";

const NOW = new Date("2026-07-25T12:00:00Z");

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const serveScoreboard = (fixture: Record<string, unknown>) =>
  server.use(http.get(SCOREBOARD_URL, () => HttpResponse.json(fixture)));

describe("fetchSeriesCalendar", () => {
  it("returns the series' match days as deduped YYYYMMDD", async () => {
    serveScoreboard(seriesFixture);
    const days = await fetchSeriesCalendar("24567");
    expect(days).toEqual([
      "20260815",
      "20260816",
      "20260817",
      "20260818",
      "20260819",
      "20260823",
      "20260824",
      "20260825",
      "20260826",
      "20260827",
    ]);
  });
});

describe("fetchSeriesEventsByDate", () => {
  it("normalizes a multi-day Test with format, series, and endDate", async () => {
    serveScoreboard(seriesFixture);
    const [event] = await fetchSeriesEventsByDate(
      { id: "24567", name: "fallback name" },
      "20260815"
    );
    expect(event).toMatchObject({
      id: "1544001",
      name: "Sri Lanka v India",
      shortName: "SL v IND",
      date: "2026-08-15T04:30Z",
      endDate: "2026-08-20T23:59Z",
      seriesId: "24567",
      seriesName: "India tour of Sri Lanka 2026", // from the response, not the fallback
      format: "test",
      formatDetail: "1st Test",
      timeValid: true,
      venue: { fullName: "Galle International Stadium" },
    });
    expect(event.fullStatus.type.state).toBe("pre");
    expect(event.competitors).toEqual([
      expect.objectContaining({
        id: "8",
        displayName: "Sri Lanka",
        abbreviation: "SL",
        homeAway: "home",
        winner: false, // string "false" in the payload
        logo: "https://a.espncdn.com/i/teamlogos/cricket/500/8.png",
      }),
      expect.objectContaining({ id: "6", displayName: "India" }),
    ]);
  });

  it("normalizes an ODI", async () => {
    serveScoreboard(odiFixture);
    const [event] = await fetchSeriesEventsByDate(
      { id: "24289", name: "West Indies tour of India 2026/27" },
      "20260927"
    );
    expect(event).toMatchObject({
      id: "1529227",
      format: "odi",
      formatDetail: "1st ODI",
      seriesName: "West Indies tour of India 2026/27",
    });
  });

  it("maps unknown or missing class to format 'other'", async () => {
    const noClass = structuredClone(odiFixture) as {
      events: Array<{ competitions: Array<{ class?: unknown }> }>;
    };
    delete noClass.events[0].competitions[0].class;
    serveScoreboard(noClass);
    const [event] = await fetchSeriesEventsByDate(
      { id: "24289", name: "x" },
      "20260927"
    );
    expect(event.format).toBe("other");
  });

  it("returns empty for a day with no matches", async () => {
    serveScoreboard({ leagues: seriesFixture.leagues });
    const events = await fetchSeriesEventsByDate(
      { id: "24567", name: "x" },
      "20260820"
    );
    expect(events).toEqual([]);
  });
});

describe("fetchAllCricketTeamEvents", () => {
  it("discovers series, walks calendars, filters to the team, dedupes, and sorts", async () => {
    const scoreboardDates: string[] = [];
    server.use(
      // Discovery: India appears only in series 24301.
      http.get(HEADER_URL, () => HttpResponse.json(headerFixture)),
      // The series' scoreboard: a calendar of repeated Test days, always
      // returning the same Test event (as ESPN does) plus a non-India match.
      http.get(SCOREBOARD_URL, ({ request, params }) => {
        expect(params.seriesId).toBe("24301");
        const date = new URL(request.url).searchParams.get("dates");
        if (date) scoreboardDates.push(date);
        return HttpResponse.json({
          leagues: seriesFixture.leagues,
          events: [...seriesFixture.events, ...odiFixture.events],
        });
      })
    );

    const events = await fetchAllCricketTeamEvents("6", NOW);

    // 10 calendar days fetched, once each…
    expect(scoreboardDates.sort()).toEqual([
      "20260815",
      "20260816",
      "20260817",
      "20260818",
      "20260819",
      "20260823",
      "20260824",
      "20260825",
      "20260826",
      "20260827",
    ]);
    // …but the repeated Test dedupes to one event, and both fixture events
    // include India, so both are kept, sorted by date.
    expect(events.map(e => e.id)).toEqual(["1544001", "1529227"]);
  });

  it("drops events the team doesn't play in", async () => {
    server.use(
      http.get(HEADER_URL, () => HttpResponse.json(headerFixture)),
      http.get(SCOREBOARD_URL, () =>
        HttpResponse.json({
          leagues: seriesFixture.leagues,
          events: [...seriesFixture.events, ...odiFixture.events],
        })
      )
    );
    // Zimbabwe (9) is discoverable via series 24301 in the header fixture,
    // but neither served event includes Zimbabwe as a competitor.
    const zimEvents = await fetchAllCricketTeamEvents("9", NOW);
    expect(zimEvents).toEqual([]);
  });

  it("returns empty when discovery finds no series", async () => {
    server.use(http.get(HEADER_URL, () => HttpResponse.json(headerFixture)));
    const events = await fetchAllCricketTeamEvents("2", NOW); // Australia: no series
    expect(events).toEqual([]);
  });
});
