import { afterAll, afterEach, beforeAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { discoverTeamSeriesIds, getDiscoveryQueries } from "./discovery.ts";
// Real (trimmed) header response for 2026-07-25: four series, India (6) only
// in 24301, Pakistan (7) only in 24436, plus a franchise tournament and a
// women's competition as negative cases.
import headerFixture from "../../../supabase/functions/calendar/fixtures/cricket-header.json";

const INDIA_ZIM_SERIES = { id: "24301", name: "India tour of Zimbabwe 2026" };
const NOW = new Date("2026-07-25T12:00:00Z");

const HEADER_URL =
  "https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header";

let requestedParams: string[] = [];

const server = setupServer(
  http.get(HEADER_URL, ({ request }) => {
    record(request);
    return HttpResponse.json(headerFixture);
  })
);

const emptyHeader = { sports: [{ leagues: [] }] };

const record = (request: Request): string => {
  const date = new URL(request.url).searchParams.get("dates") ?? "";
  requestedParams.push(date);
  return date;
};

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  requestedParams = [];
});
afterAll(() => server.close());

describe("getDiscoveryQueries", () => {
  const { dailyDates, months } = getDiscoveryQueries(NOW);

  it("covers lookback through the end of the current month daily", () => {
    expect(dailyDates[0]).toBe("20260711"); // 14 days before NOW
    expect(dailyDates.at(-1)).toBe("20260731");
    expect(dailyDates).toHaveLength(21); // Jul 11 → Jul 31, every day
  });

  it("covers following months through the lookahead horizon monthly", () => {
    // NOW + 180 days = 2027-01-21, so months run Aug 2026 → Jan 2027.
    expect(months).toEqual([
      "202608",
      "202609",
      "202610",
      "202611",
      "202612",
      "202701",
    ]);
  });

  it("crosses year boundaries in the daily span", () => {
    const yearEnd = getDiscoveryQueries(new Date("2026-12-20T00:00:00Z"));
    expect(yearEnd.dailyDates[0]).toBe("20261206"); // 14 days before
    expect(yearEnd.dailyDates.at(-1)).toBe("20261231");
    expect(yearEnd.months[0]).toBe("202701");
  });
});

describe("discoverTeamSeriesIds", () => {
  it("returns only series where the team is a competitor, deduped across queries", async () => {
    const series = await discoverTeamSeriesIds("6", NOW);
    // Every query served the same fixture; dedupe must collapse them.
    expect(series).toEqual([INDIA_ZIM_SERIES]);
    const { dailyDates, months } = getDiscoveryQueries(NOW);
    expect(new Set(requestedParams)).toEqual(
      new Set([...dailyDates, ...months])
    );
  });

  it("matches competitor ids exactly", async () => {
    const series = await discoverTeamSeriesIds("7", NOW);
    expect(series).toEqual([
      { id: "24436", name: "Pakistan tour of West Indies 2026" },
    ]);
  });

  it("returns empty for a team not playing in the window", async () => {
    const series = await discoverTeamSeriesIds("2", NOW);
    expect(series).toEqual([]);
  });

  it("skips failed requests instead of failing the scan", async () => {
    const failingDate = getDiscoveryQueries(NOW).dailyDates[0];
    server.use(
      http.get(HEADER_URL, ({ request }) => {
        const date = record(request);
        if (date === failingDate) return HttpResponse.error();
        return HttpResponse.json(headerFixture);
      })
    );
    const series = await discoverTeamSeriesIds("6", NOW);
    expect(series).toEqual([INDIA_ZIM_SERIES]);
  });

  it("skips malformed responses", async () => {
    server.use(
      http.get(HEADER_URL, () =>
        HttpResponse.text("<html>Access Denied</html>")
      )
    );
    const series = await discoverTeamSeriesIds("6", NOW);
    expect(series).toEqual([]);
  });

  it("retries an empty month once (cold ESPN cache)", async () => {
    let firstMonthCall = true;
    server.use(
      http.get(HEADER_URL, ({ request }) => {
        const date = record(request);
        if (date.length === 8) return HttpResponse.json(emptyHeader);
        if (date === "202608" && firstMonthCall) {
          firstMonthCall = false;
          return HttpResponse.json(emptyHeader);
        }
        return HttpResponse.json(headerFixture);
      })
    );
    const series = await discoverTeamSeriesIds("6", NOW);
    expect(series).toEqual([INDIA_ZIM_SERIES]);
    expect(requestedParams.filter(p => p === "202608")).toHaveLength(2);
  });

  it("does not top-up-scan a truncated busy league (spotting a series once is enough)", async () => {
    // A dense domestic league truncated mid-month WITHOUT the team must not
    // trigger any per-day rescan — the team is found via its own series, and
    // the caller pulls that series' full schedule by year.
    const truncatedMonth = {
      sports: [
        {
          leagues: [
            {
              id: "19601",
              name: "The Hundred Men's Competition",
              events: Array.from({ length: 20 }, () => ({
                competitors: [{ id: "1204501" }, { id: "1204497" }],
              })),
            },
          ],
        },
      ],
    };
    server.use(
      http.get(HEADER_URL, ({ request }) => {
        const date = record(request);
        if (date === "202608") return HttpResponse.json(truncatedMonth);
        return HttpResponse.json(headerFixture);
      })
    );
    await discoverTeamSeriesIds("6", NOW);
    // Only the planned queries ran — no extra August daily top-up requests.
    const { dailyDates, months } = getDiscoveryQueries(NOW);
    const augustDailies = requestedParams.filter(
      p => p.length === 8 && p.startsWith("202608")
    );
    expect(augustDailies).toHaveLength(0);
    expect(requestedParams.length).toBe(dailyDates.length + months.length);
  });
});
