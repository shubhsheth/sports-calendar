// Integration tests for the personal combined feed (GET /calendar/my/:token.ics).
//
// Same harness as index.test.ts: Deno runtime, global fetch stubbed with
// fixture JSON for ESPN and with in-memory rows for the PostgREST calendar
// lookup. Run with:
//   deno test --allow-read --allow-env --config supabase/functions/deno.json \
//     supabase/functions/calendar/my-feed.test.ts

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function fixture(name: string): Promise<unknown> {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  return JSON.parse(await Deno.readTextFile(url));
}

const nbaDetail = await fixture("nba.json");
const iplScoreboard = await fixture("ipl-scoreboard.json");
const cricketHeader = await fixture("cricket-header.json");
const cricketSeries = await fixture("cricket-series-scoreboard.json");

Deno.env.set("SUPABASE_URL", "http://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-key");

// Import the app without binding a port (index.ts calls Deno.serve at top level).
const realServe = Deno.serve;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown() {} });
const { app } = await import("./index.ts");
Deno.serve = realServe;

const TOKEN = "12345678-1234-1234-1234-123456789abc";

type CalendarRow = {
  calendar_subscriptions: { league: string; filters: unknown }[];
  calendar_pinned_events: { league: string; espn_event_id: string }[];
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

const realFetch = globalThis.fetch;

/** Stub ESPN (NBA + IPL + cricket fixtures) and PostgREST (`rows` for the token). */
function installFetchMock(rows: CalendarRow[]): {
  postgrestCalls: () => number;
  headerCalls: () => number;
} {
  let postgrestCalls = 0;
  let headerCalls = 0;
  globalThis.fetch = ((input: string | URL | Request): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.startsWith("http://supabase.test/rest/v1/calendars")) {
      postgrestCalls++;
      const matches = url.includes(`feed_token=eq.${TOKEN}`);
      return Promise.resolve(jsonResponse(matches ? rows : []));
    }

    // Cricket team discovery: same multi-series header (India in 24301) for
    // every sampled day/month.
    if (url.includes("/scoreboard/header")) {
      headerCalls++;
      return Promise.resolve(jsonResponse(cricketHeader));
    }

    // Cricket team series scoreboard (calendar + the SL v IND Test, id 1544001).
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

  return {
    postgrestCalls: () => postgrestCalls,
    headerCalls: () => headerCalls,
  };
}

function restoreFetch(): void {
  globalThis.fetch = realFetch;
}

function uidsOf(body: string): string[] {
  return [...body.matchAll(/^UID:(.+)$/gm)].map(m => m[1].trim());
}

Deno.test("malformed token 404s without touching the database", async () => {
  const mock = installFetchMock([]);
  try {
    for (const path of [
      "/calendar/my/not-a-uuid.ics",
      `/calendar/my/${TOKEN}`, // missing .ics
      "/calendar/my/1%20OR%201=1.ics",
    ]) {
      const res = await app.request(path);
      assert(res.status === 404, `${path}: expected 404, got ${res.status}`);
      await res.body?.cancel();
    }
    assert(mock.postgrestCalls() === 0, "expected no PostgREST lookups");
  } finally {
    restoreFetch();
  }
});

Deno.test("unknown token returns 404", async () => {
  installFetchMock([]);
  try {
    const res = await app.request(
      "/calendar/my/00000000-0000-0000-0000-000000000000.ics"
    );
    assert(res.status === 404, `expected 404, got ${res.status}`);
    await res.body?.cancel();
  } finally {
    restoreFetch();
  }
});

Deno.test(
  "combines subscription and pins across leagues, deduped by UID",
  async () => {
    // NBA subscription filtered to team 25 (fixture event 401 matches), the
    // same NBA event also pinned (must not duplicate), plus an IPL pin with
    // no IPL subscription.
    installFetchMock([
      {
        calendar_subscriptions: [
          { league: "nba", filters: { teamIds: ["25"] } },
        ],
        calendar_pinned_events: [
          { league: "nba", espn_event_id: "401" },
          { league: "ipl", espn_event_id: "701" },
        ],
      },
    ]);
    try {
      const res = await app.request(`/calendar/my/${TOKEN}.ics`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const contentType = res.headers.get("content-type") ?? "";
      assert(
        contentType.includes("text/calendar"),
        `expected text/calendar, got "${contentType}"`
      );

      const body = await res.text();
      const uids = uidsOf(body).sort();
      assert(
        uids.length === 2 &&
          uids[0] === "401@sports-calendar" &&
          uids[1] === "701@sports-calendar",
        `expected exactly [401, 701]@sports-calendar, got [${uids.join(", ")}]`
      );
    } finally {
      restoreFetch();
    }
  }
);

Deno.test("subscription filters exclude non-matching events", async () => {
  // Team 99 matches nothing in the fixture; no pins → empty but valid ICS.
  installFetchMock([
    {
      calendar_subscriptions: [{ league: "nba", filters: { teamIds: ["99"] } }],
      calendar_pinned_events: [],
    },
  ]);
  try {
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await res.text();
    assert(body.includes("BEGIN:VCALENDAR"), "expected a VCALENDAR");
    assert(uidsOf(body).length === 0, "expected no events");
  } finally {
    restoreFetch();
  }
});

Deno.test(
  "a subscription with invalid stored filters is skipped, not fatal",
  async () => {
    // F1 types "99" fails parseF1Params; the NBA pin must still come through.
    installFetchMock([
      {
        calendar_subscriptions: [{ league: "f1", filters: { types: ["99"] } }],
        calendar_pinned_events: [{ league: "nba", espn_event_id: "401" }],
      },
    ]);
    try {
      const res = await app.request(`/calendar/my/${TOKEN}.ics`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.text();
      const uids = uidsOf(body);
      assert(
        uids.length === 1 && uids[0] === "401@sports-calendar",
        `expected only the NBA pin, got [${uids.join(", ")}]`
      );
    } finally {
      restoreFetch();
    }
  }
);

Deno.test(
  "a cricket-team subscription joins the combined feed with its format filter",
  async () => {
    // India (6) filtered to Tests: the fixture's SL v IND Test comes through
    // alongside an NBA pin.
    installFetchMock([
      {
        calendar_subscriptions: [
          {
            league: "cricket-team",
            filters: { teamId: "6", formats: ["test"] },
          },
        ],
        calendar_pinned_events: [{ league: "nba", espn_event_id: "401" }],
      },
    ]);
    try {
      const res = await app.request(`/calendar/my/${TOKEN}.ics`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.text();
      const uids = uidsOf(body).sort();
      assert(
        uids.length === 2 &&
          uids[0] === "1544001@sports-calendar" &&
          uids[1] === "401@sports-calendar",
        `expected [1544001, 401]@sports-calendar, got [${uids.join(", ")}]`
      );
      assert(
        body.includes("India tour of Sri Lanka 2026"),
        "expected the series name in the cricket event description"
      );
    } finally {
      restoreFetch();
    }
  }
);

Deno.test(
  "a pinned cricket match resolves from its series without a discovery scan",
  async () => {
    const mock = installFetchMock([
      {
        calendar_subscriptions: [],
        calendar_pinned_events: [
          { league: "cricket-team", espn_event_id: "24301:1544001" },
        ],
      },
    ]);
    try {
      const res = await app.request(`/calendar/my/${TOKEN}.ics`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.text();
      const uids = uidsOf(body);
      assert(
        uids.length === 1 && uids[0] === "1544001@sports-calendar",
        `expected only the pinned match, got [${uids.join(", ")}]`
      );
      assert(
        mock.headerCalls() === 0,
        `pin resolution must not run discovery (got ${mock.headerCalls()} header calls)`
      );
    } finally {
      restoreFetch();
    }
  }
);

Deno.test(
  "a cricket pin matching a cricket subscription appears once; bad rows are skipped",
  async () => {
    installFetchMock([
      {
        calendar_subscriptions: [
          { league: "cricket-team", filters: { teamId: "6" } },
          // Unknown team: skipped, not fatal.
          { league: "cricket-team", filters: { teamId: "999" } },
        ],
        calendar_pinned_events: [
          { league: "cricket-team", espn_event_id: "24301:1544001" },
          // Malformed pin id: skipped, not fatal.
          { league: "cricket-team", espn_event_id: "not-composite" },
        ],
      },
    ]);
    try {
      const res = await app.request(`/calendar/my/${TOKEN}.ics`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.text();
      const uids = uidsOf(body);
      assert(
        uids.length === 1 && uids[0] === "1544001@sports-calendar",
        `expected the deduped match only, got [${uids.join(", ")}]`
      );
    } finally {
      restoreFetch();
    }
  }
);

Deno.test("an empty calendar returns a valid empty feed", async () => {
  installFetchMock([
    { calendar_subscriptions: [], calendar_pinned_events: [] },
  ]);
  try {
    const res = await app.request(`/calendar/my/${TOKEN}.ics`);
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const body = await res.text();
    assert(body.includes("BEGIN:VCALENDAR"), "expected a VCALENDAR");
    assert(uidsOf(body).length === 0, "expected no events");
  } finally {
    restoreFetch();
  }
});
