import { describe, expect, it } from "vitest";
import { buildCricketTeamFeedUrl } from "./buildCricketTeamFeedUrl";

// VITE_CALENDAR_FEED_BASE_URL is unset in tests, so URLs default to the site's
// own origin + /calendar (Firebase Hosting rewrites /calendar/** to the feed
// function).
const BASE = `${window.location.origin}/calendar`;

describe("buildCricketTeamFeedUrl", () => {
  it("builds the team feed path without params when no formats selected", () => {
    expect(buildCricketTeamFeedUrl("6", [])).toBe(`${BASE}/cricket-team/6.ics`);
  });

  it("encodes the format filter", () => {
    expect(buildCricketTeamFeedUrl("6", ["test", "odi"])).toBe(
      `${BASE}/cricket-team/6.ics?formats=test%2Codi`
    );
  });
});
