import { afterAll, afterEach, beforeAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchEventDetails } from "./fetchEventDetails";

const MOCK_EVENT = {
  id: "123",
  name: "Test Event",
  date: "2026-01-01T00:00:00Z",
};

let capturedUrl: string | null = null;

const server = setupServer(
  http.get("https://*", ({ request }) => {
    capturedUrl = request.url;
    return HttpResponse.json(MOCK_EVENT);
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  capturedUrl = null;
});
afterAll(() => server.close());

describe("fetchEventDetails", () => {
  it("returns the parsed JSON from the ref URL", async () => {
    const result = await fetchEventDetails(
      "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/123"
    );
    expect(result).toEqual(MOCK_EVENT);
  });

  it("normalizes http:// to https:// in the ref URL", async () => {
    await fetchEventDetails(
      "http://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/123"
    );
    expect(capturedUrl).toMatch(/^https:\/\//);
  });

  it("does not double-normalize an already-https URL", async () => {
    await fetchEventDetails(
      "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/456"
    );
    expect(capturedUrl).not.toContain("https://https://");
  });

  it("fetches the exact URL (with https) that was passed in", async () => {
    const url =
      "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/789";
    await fetchEventDetails(url);
    expect(capturedUrl).toBe(url);
  });
});
