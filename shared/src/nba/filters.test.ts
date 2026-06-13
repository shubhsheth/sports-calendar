import { describe, it, expect } from "vitest";
import { filterNbaEvent, filterNbaEvents } from "./filters";
import type { NbaEvent, NbaEventCompetition } from "./types";

const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

const teamRef = (id: string) =>
  `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/${id}`;

function makeCompetition(
  override: Partial<NbaEventCompetition> = {}
): NbaEventCompetition {
  return {
    $ref: "https://ref",
    id: "comp1",
    date: FUTURE_DATE,
    type: { id: "2", text: "Regular Season", abbreviation: "RS" },
    timeValid: true,
    recent: false,
    bracketAvailable: false,
    gameSource: { id: "1", description: "ESPN", state: "full" },
    competitors: [
      { $ref: "https://ref", homeAway: "home", team: { $ref: teamRef("9") } },
      { $ref: "https://ref", homeAway: "away", team: { $ref: teamRef("14") } },
    ],
    ...override,
  };
}

function makeEvent(
  competitions: NbaEventCompetition[] = [makeCompetition()]
): NbaEvent {
  return {
    $ref: "https://ref",
    id: "evt1",
    date: FUTURE_DATE,
    name: "Team A at Team B",
    shortName: "A @ B",
    season: { $ref: "https://season" },
    competitions,
  };
}

describe("filterNbaEvent", () => {
  it("returns event unchanged when no filters apply", () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, { showPastEvents: true, teamIds: [] });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it("keeps future competition when showPastEvents is false", () => {
    const event = makeEvent([makeCompetition({ date: FUTURE_DATE })]);
    const result = filterNbaEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).not.toBeNull();
  });

  it("removes past competition when showPastEvents is false", () => {
    const event = makeEvent([makeCompetition({ date: PAST_DATE })]);
    const result = filterNbaEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toBeNull();
  });

  it("keeps past competition when showPastEvents is true", () => {
    const event = makeEvent([makeCompetition({ date: PAST_DATE })]);
    const result = filterNbaEvent(event, { showPastEvents: true, teamIds: [] });
    expect(result).not.toBeNull();
  });

  it("keeps competition when home team id matches teamIds filter", () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, {
      showPastEvents: true,
      teamIds: ["9"],
    });
    expect(result).not.toBeNull();
  });

  it("keeps competition when away team id matches teamIds filter", () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, {
      showPastEvents: true,
      teamIds: ["14"],
    });
    expect(result).not.toBeNull();
  });

  it("removes competition when no competitor matches teamIds filter", () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, {
      showPastEvents: true,
      teamIds: ["999"],
    });
    expect(result).toBeNull();
  });

  it("returns all events when teamIds is empty", () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, { showPastEvents: true, teamIds: [] });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it("keeps only future competitions in a multi-competition event when showPastEvents is false", () => {
    const past = makeCompetition({ id: "past", date: PAST_DATE });
    const future = makeCompetition({ id: "future", date: FUTURE_DATE });
    const event = makeEvent([past, future]);
    const result = filterNbaEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
    expect(result!.competitions[0].id).toBe("future");
  });
});

describe("filterNbaEvents", () => {
  it("drops events where all competitions are filtered out", () => {
    const past = makeEvent([makeCompetition({ date: PAST_DATE })]);
    const future = makeEvent([
      makeCompetition({ id: "comp2", date: FUTURE_DATE }),
    ]);
    future.id = "evt2";
    const result = filterNbaEvents([past, future], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("evt2");
  });

  it("returns all events when nothing is filtered", () => {
    const events = [makeEvent(), { ...makeEvent(), id: "evt2" }];
    const result = filterNbaEvents(events, {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).toHaveLength(2);
  });

  it("returns empty array when input is empty", () => {
    expect(filterNbaEvents([], { showPastEvents: true, teamIds: [] })).toEqual(
      []
    );
  });
});
