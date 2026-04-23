import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import app from "../../src/index.ts";
import iplScoreboard from "../fixtures/ipl-scoreboard.json";

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    vi.fn(async () => jsonResponse(iplScoreboard)) as unknown as typeof fetch
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /calendar/ipl.ics", () => {
  it("returns status 200", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/ipl.ics"));
    expect(res.status).toBe(200);
  });

  it("returns Content-Type text/calendar", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/ipl.ics"));
    expect(res.headers.get("content-type")).toContain("text/calendar");
  });

  it("body contains BEGIN:VCALENDAR", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/ipl.ics"));
    expect(await res.text()).toContain("BEGIN:VCALENDAR");
  });

  it("body contains BEGIN:VEVENT", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/ipl.ics"));
    expect(await res.text()).toContain("BEGIN:VEVENT");
  });

  it("body contains UID:", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/ipl.ics"));
    expect(await res.text()).toContain("UID:");
  });

  it("body contains DTSTART:", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/ipl.ics"));
    expect(await res.text()).toContain("DTSTART");
  });

  it("returns 400 for invalid showPastEvents", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/ipl.ics?showPastEvents=invalid")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for showPastEvents=false", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/ipl.ics?showPastEvents=false")
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for matching teamId filter", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/ipl.ics?teamIds=pbks")
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for non-matching teamId (empty calendar, still valid)", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/ipl.ics?teamIds=csk")
    );
    expect(res.status).toBe(200);
  });
});
