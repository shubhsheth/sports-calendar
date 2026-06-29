import { describe, it, expect } from "vitest";
import { filterNflEvent, filterNflEvents } from "./filters.ts";
import type { NflEvent, NflEventCompetition } from "./types.ts";

const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

const teamRef = (id: string) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/${id}`;

function makeCompetition(
  override: Partial<NflEventCompetition> = {}
): NflEventCompetition {
  return {
    $ref: "https://ref",
    id: "comp1",
    date: FUTURE_DATE,
    type: { id: "2", text: "Regular Season", abbreviation: "RS" },
    timeValid: true,
    recent: false,
    bracketAvailable: false,
    competitors: [
      { $ref: "https://ref", homeAway: "home", team: { $ref: teamRef("1") } },
      { $ref: "https://ref", homeAway: "away", team: { $ref: teamRef("2") } },
    ],
    ...override,
  };
}

function makeEvent(
  competitions: NflEventCompetition[] = [makeCompetition()]
): NflEvent {
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

describe("filterNflEvent", () => {
  it("returns event unchanged when no filters apply", () => {
    const result = filterNflEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it("keeps future competition when showPastEvents is false", () => {
    const result = filterNflEvent(
      makeEvent([makeCompetition({ date: FUTURE_DATE })]),
      { showPastEvents: false, teamIds: [] }
    );
    expect(result).not.toBeNull();
  });

  it("removes past competition when showPastEvents is false", () => {
    const result = filterNflEvent(
      makeEvent([makeCompetition({ date: PAST_DATE })]),
      { showPastEvents: false, teamIds: [] }
    );
    expect(result).toBeNull();
  });

  it("keeps past competition when showPastEvents is true", () => {
    const result = filterNflEvent(
      makeEvent([makeCompetition({ date: PAST_DATE })]),
      { showPastEvents: true, teamIds: [] }
    );
    expect(result).not.toBeNull();
  });

  it("keeps competition when home team id matches teamIds filter", () => {
    const result = filterNflEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: ["1"],
    });
    expect(result).not.toBeNull();
  });

  it("keeps competition when away team id matches teamIds filter", () => {
    const result = filterNflEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: ["2"],
    });
    expect(result).not.toBeNull();
  });

  it("removes competition when no competitor matches teamIds filter", () => {
    const result = filterNflEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: ["999"],
    });
    expect(result).toBeNull();
  });

  it("returns all events when teamIds is empty", () => {
    const result = filterNflEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).not.toBeNull();
  });

  it("keeps only future competitions in a multi-competition event when showPastEvents is false", () => {
    const event = makeEvent([
      makeCompetition({ id: "past", date: PAST_DATE }),
      makeCompetition({ id: "future", date: FUTURE_DATE }),
    ]);
    const result = filterNflEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
    expect(result!.competitions[0].id).toBe("future");
  });
});

describe("filterNflEvents", () => {
  it("drops events where all competitions are filtered out", () => {
    const past = makeEvent([makeCompetition({ date: PAST_DATE })]);
    const future = { ...makeEvent(), id: "evt2" };
    const result = filterNflEvents([past, future], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("evt2");
  });

  it("returns all events when nothing is filtered", () => {
    const events = [makeEvent(), { ...makeEvent(), id: "evt2" }];
    expect(
      filterNflEvents(events, { showPastEvents: true, teamIds: [] })
    ).toHaveLength(2);
  });

  it("returns empty array when input is empty", () => {
    expect(filterNflEvents([], { showPastEvents: true, teamIds: [] })).toEqual(
      []
    );
  });
});
