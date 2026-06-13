// Integration tests for the calendar Edge Function.
//
// These run under Deno (the function's runtime), not vitest. ESPN is mocked by
// stubbing the global `fetch` with fixture JSON, so no network or running
// Supabase instance is required. Run with:
//   deno test --allow-read --allow-env --config supabase/functions/deno.json \
//     supabase/functions/calendar/index.test.ts

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function fixture(name: string): Promise<unknown> {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  return JSON.parse(await Deno.readTextFile(url));
}

const nbaDetail = await fixture("nba.json");
const nflDetail = await fixture("nfl.json");
const f1Detail = await fixture("f1.json");
const iplScoreboard = await fixture("ipl-scoreboard.json");

// Import the app without binding a port: stub Deno.serve for the duration of
// the (dynamic) import, since index.ts calls Deno.serve at module top level.
const realServe = Deno.serve;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown() {} });
const { app } = await import("./index.ts");
Deno.serve = realServe;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

const DETAILS: Record<string, unknown> = {
  "/events/401": nbaDetail,
  "/events/501": nflDetail,
  "/events/601": f1Detail,
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

function restoreFetch(): void {
  globalThis.fetch = realFetch;
}

const ROUTES = ["nba", "nfl", "f1", "ipl"];

Deno.test("each league route returns valid text/calendar ICS (200)", async () => {
  installFetchMock();
  try {
    for (const route of ROUTES) {
      const res = await app.request(`/calendar/${route}.ics`);
      assert(res.status === 200, `${route}: expected 200, got ${res.status}`);

      const contentType = res.headers.get("content-type") ?? "";
      assert(
        contentType.includes("text/calendar"),
        `${route}: expected text/calendar, got "${contentType}"`
      );

      const body = await res.text();
      for (const marker of ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:", "DTSTART"]) {
        assert(body.includes(marker), `${route}: ICS body missing "${marker}"`);
      }
    }
  } finally {
    restoreFetch();
  }
});

Deno.test("invalid showPastEvents returns 400 on every route", async () => {
  installFetchMock();
  try {
    for (const route of ROUTES) {
      const res = await app.request(
        `/calendar/${route}.ics?showPastEvents=invalid`
      );
      assert(res.status === 400, `${route}: expected 400, got ${res.status}`);
    }
  } finally {
    restoreFetch();
  }
});
