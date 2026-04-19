import { describe, it, expect, vi, beforeEach } from "vitest";
import { filterNbaEvents, filterNbaEvent } from "./nba.ts";
import type { NbaEvent, NbaEventFilters } from "../types/nba.ts";
import * as eventStatus from "../lib/eventStatus.ts";

function makeEvent(overrides: Partial<NbaEvent> = {}): NbaEvent {
  return {
    $ref: "https://example.com/event/1",
    id: "1",
    date: "2026-04-01T00:00:00Z",
    name: "Team A vs Team B",
    shortName: "TA @ TB",
    season: { $ref: "https://example.com/season/1" },
    competitions: [
      {
        $ref: "https://example.com/comp/1",
        id: "c1",
        date: "2026-04-01T00:00:00Z",
        type: { id: "1", text: "Standard", abbreviation: "STD" },
        timeValid: true,
        recent: false,
        bracketAvailable: false,
        gameSource: { id: "1", description: "ESPN", state: "full" },
        competitors: [
          {
            $ref: "",
            homeAway: "home",
            team: { $ref: "https://example.com/teams/10" },
          },
          {
            $ref: "",
            homeAway: "away",
            team: { $ref: "https://example.com/teams/20" },
          },
        ],
      },
    ],
    ...overrides,
  };
}

const defaultFilters: NbaEventFilters = { showPastEvents: true, teamIds: [] };

describe("filterNbaEvents", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns all events when showPastEvents=true and no teamIds", () => {
    const events = [makeEvent({ id: "1" }), makeEvent({ id: "2" })];
    expect(filterNbaEvents(events, defaultFilters)).toHaveLength(2);
  });

  it("removes past events when showPastEvents=false", () => {
    vi.spyOn(eventStatus, "isEventPast").mockReturnValue(true);
    const events = [makeEvent()];
    const result = filterNbaEvents(events, {
      ...defaultFilters,
      showPastEvents: false,
    });
    expect(result).toHaveLength(0);
  });

  it("keeps future events when showPastEvents=false", () => {
    vi.spyOn(eventStatus, "isEventPast").mockReturnValue(false);
    const events = [makeEvent()];
    const result = filterNbaEvents(events, {
      ...defaultFilters,
      showPastEvents: false,
    });
    expect(result).toHaveLength(1);
  });

  it("filters by teamId — keeps event with matching team", () => {
    const events = [makeEvent()];
    const result = filterNbaEvents(events, {
      ...defaultFilters,
      teamIds: ["10"],
    });
    expect(result).toHaveLength(1);
  });

  it("filters by teamId — removes event without matching team", () => {
    const events = [makeEvent()];
    const result = filterNbaEvents(events, {
      ...defaultFilters,
      teamIds: ["99"],
    });
    expect(result).toHaveLength(0);
  });

  it("empty teamIds returns all events", () => {
    const events = [makeEvent()];
    const result = filterNbaEvents(events, { ...defaultFilters, teamIds: [] });
    expect(result).toHaveLength(1);
  });

  it("returns null from filterNbaEvent when all competitions filtered out", () => {
    vi.spyOn(eventStatus, "isEventPast").mockReturnValue(true);
    expect(
      filterNbaEvent(makeEvent(), { ...defaultFilters, showPastEvents: false })
    ).toBeNull();
  });
});
