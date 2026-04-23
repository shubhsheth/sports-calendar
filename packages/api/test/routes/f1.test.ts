import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import app from "../../src/index.ts";
import f1Refs from "../fixtures/f1-refs.json";
import f1Event from "../fixtures/f1-event.json";

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

function makeMockFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("events/600125342") && !url.includes("events/?")) {
      return jsonResponse(f1Event);
    }
    return jsonResponse(f1Refs);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(makeMockFetch());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /calendar/f1.ics", () => {
  it("returns status 200", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/f1.ics"));
    expect(res.status).toBe(200);
  });

  it("returns Content-Type text/calendar", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/f1.ics"));
    expect(res.headers.get("content-type")).toContain("text/calendar");
  });

  it("body contains BEGIN:VCALENDAR", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/f1.ics"));
    expect(await res.text()).toContain("BEGIN:VCALENDAR");
  });

  it("body contains BEGIN:VEVENT", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/f1.ics"));
    expect(await res.text()).toContain("BEGIN:VEVENT");
  });

  it("body contains UID:", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/f1.ics"));
    expect(await res.text()).toContain("UID:");
  });

  it("body contains DTSTART:", async () => {
    const res = await app.fetch(new Request("http://localhost/calendar/f1.ics"));
    expect(await res.text()).toContain("DTSTART");
  });

  it("returns 400 for invalid showPastEvents", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/f1.ics?showPastEvents=invalid")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for showPastEvents=false", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/f1.ics?showPastEvents=false")
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 for valid types filter", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/f1.ics?types=3")
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid F1 session type", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/f1.ics?types=99")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for multiple valid types", async () => {
    const res = await app.fetch(
      new Request("http://localhost/calendar/f1.ics?types=2,3")
    );
    expect(res.status).toBe(200);
  });
});
