import { describe, it, expect } from "vitest";
import { filterFifaEvent, filterFifaEvents } from "./filters.ts";
import type { FifaEvent, FifaEventCompetition } from "./types.ts";

const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

function makeCompetition(
  override: Partial<FifaEventCompetition> = {}
): FifaEventCompetition {
  return {
    $ref: "https://ref",
    id: "comp1",
    date: FUTURE_DATE,
    type: { id: "2", text: "Group Stage", abbreviation: "GRP" },
    timeValid: true,
    recent: false,
    bracketAvailable: false,
    gameSource: { id: "1", description: "ESPN", state: "full" },
    competitors: [
      {
        $ref: "https://comp-home",
        homeAway: "home",
        team: {
          $ref: "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/teams/202",
        },
      },
      {
        $ref: "https://comp-away",
        homeAway: "away",
        team: {
          $ref: "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/teams/164",
        },
      },
    ],
    ...override,
  };
}

function makeEvent(
  competitions: FifaEventCompetition[] = [makeCompetition()]
): FifaEvent {
  return {
    $ref: "https://ref",
    id: "evt1",
    date: FUTURE_DATE,
    name: "Brazil at Argentina",
    shortName: "BRA @ ARG",
    season: { $ref: "https://season" },
    competitions,
  };
}

const noFilters = { showPastEvents: true, teamIds: [] };

describe("filterFifaEvent", () => {
  it("returns the event unchanged when no filters are active", () => {
    const event = makeEvent();
    expect(filterFifaEvent(event, noFilters)).toEqual(event);
  });

  it("removes past competitions when showPastEvents is false", () => {
    const event = makeEvent([makeCompetition({ date: PAST_DATE })]);
    expect(
      filterFifaEvent(event, { showPastEvents: false, teamIds: [] })
    ).toBeNull();
  });

  it("keeps past competitions when showPastEvents is true", () => {
    const event = makeEvent([makeCompetition({ date: PAST_DATE })]);
    const result = filterFifaEvent(event, {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).not.toBeNull();
  });

  it("keeps event when a selected team is a competitor", () => {
    const event = makeEvent();
    const result = filterFifaEvent(event, {
      showPastEvents: true,
      teamIds: ["202"],
    });
    expect(result).not.toBeNull();
  });

  it("removes event when no selected team is a competitor", () => {
    const event = makeEvent();
    const result = filterFifaEvent(event, {
      showPastEvents: true,
      teamIds: ["999"],
    });
    expect(result).toBeNull();
  });

  it("returns null when all competitions are filtered out", () => {
    const event = makeEvent([
      makeCompetition({ date: PAST_DATE }),
      makeCompetition({ date: PAST_DATE }),
    ]);
    expect(
      filterFifaEvent(event, { showPastEvents: false, teamIds: [] })
    ).toBeNull();
  });
});

describe("filterFifaEvents", () => {
  it("drops events with no remaining competitions", () => {
    const future = makeEvent([makeCompetition({ date: FUTURE_DATE })]);
    const past = {
      ...makeEvent([makeCompetition({ date: PAST_DATE })]),
      id: "evt2",
    };
    const result = filterFifaEvents([future, past], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("evt1");
  });

  it("returns empty array when input is empty", () => {
    expect(filterFifaEvents([], noFilters)).toEqual([]);
  });

  it("returns all events when nothing is filtered", () => {
    const events = [makeEvent(), { ...makeEvent(), id: "evt2" }];
    expect(filterFifaEvents(events, noFilters)).toHaveLength(2);
  });
});
