import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import app from "../../src/index.ts";
import nflRefs from "../fixtures/nfl-refs.json";
import nflEvent from "../fixtures/nfl-event.json";

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

function makeMockFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("events/401547408") && !url.includes("events/?")) {
      return jsonResponse(nflEvent);
    }
    return jsonResponse(nflRefs);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(makeMockFetch());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /calendar/nfl.ics", () => {
  it("returns status 200", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/nfl.ics"));
    expect(res.status).toBe(200);
  });

  it("returns Content-Type text/calendar", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/nfl.ics"));
    expect(res.headers.get("content-type")).toContain("text/calendar");
  });

  it("body contains BEGIN:VCALENDAR", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/nfl.ics"));
    expect(await res.text()).toContain("BEGIN:VCALENDAR");
  });

  it("body contains BEGIN:VEVENT", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/nfl.ics"));
    expect(await res.text()).toContain("BEGIN:VEVENT");
  });

  it("body contains UID:", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/nfl.ics"));
    expect(await res.text()).toContain("UID:");
  });

  it("body contains DTSTART:", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/nfl.ics"));
    expect(await res.text()).toContain("DTSTART");
  });

  it("returns 400 for invalid showPastEvents", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/nfl.ics?showPastEvents=invalid")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for showPastEvents=false", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/nfl.ics?showPastEvents=false")
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for valid teamIds filter", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/nfl.ics?teamIds=2")
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for non-matching teamId (empty calendar, still valid)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/nfl.ics?teamIds=99999")
    );
    expect(res.status).toBe(200);
  });
});
