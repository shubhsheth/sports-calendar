import type {
  FifaEvent,
  FifaEventCompetition,
  FifaEventFilters,
} from "@sports-calendar/shared";
import {
  filterFifaEvent,
  filterFifaEvents,
  toggleShowPastEvents,
  toggleTeamFilter,
} from "./filterFifaEvents";

// Dates relative to the test environment
const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

const BASE_COMPETITION: FifaEventCompetition = {
  $ref: "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/events/1/competitions/1",
  id: "1",
  date: FUTURE_DATE,
  type: { id: "2", text: "Group Stage", abbreviation: "GRP" },
  timeValid: true,
  recent: false,
  bracketAvailable: false,
  gameSource: { id: "0", description: "Unknown", state: "full" },
  venue: {
    $ref: "https://venue",
    fullName: "SoFi Stadium",
    address: { city: "Inglewood", country: "USA" },
  },
  competitors: [
    {
      $ref: "https://comp1",
      homeAway: "home",
      team: {
        $ref: "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/teams/202",
      },
    },
    {
      $ref: "https://comp2",
      homeAway: "away",
      team: {
        $ref: "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/teams/164",
      },
    },
  ],
};

function makeEvent(
  competitions: Partial<FifaEventCompetition>[] = [{}]
): FifaEvent {
  return {
    $ref: "https://event",
    id: "1",
    date: FUTURE_DATE,
    name: "Brazil at Argentina",
    shortName: "BRA @ ARG",
    season: { $ref: "https://season" },
    competitions: competitions.map(overrides => ({
      ...BASE_COMPETITION,
      ...overrides,
    })),
  };
}

const noFilters: FifaEventFilters = { showPastEvents: true, teamIds: [] };

describe("filterFifaEvent", () => {
  it("returns the event unchanged when no filters are active", () => {
    const event = makeEvent();
    expect(filterFifaEvent(event, noFilters)).toEqual(event);
  });

  it("removes past competitions when showPastEvents is false", () => {
    const event = makeEvent([{ date: PAST_DATE }]);
    const result = filterFifaEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toBeNull();
  });

  it("keeps past competitions when showPastEvents is true", () => {
    const event = makeEvent([{ date: PAST_DATE }]);
    const result = filterFifaEvent(event, {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it("keeps event when a selected team is a competitor (home)", () => {
    const event = makeEvent();
    const result = filterFifaEvent(event, {
      showPastEvents: true,
      teamIds: ["202"],
    });
    expect(result).not.toBeNull();
  });

  it("keeps event when a selected team is a competitor (away)", () => {
    const event = makeEvent();
    const result = filterFifaEvent(event, {
      showPastEvents: true,
      teamIds: ["164"],
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

  it("shows all events when teamIds is empty (no team filter)", () => {
    const event = makeEvent();
    const result = filterFifaEvent(event, {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).not.toBeNull();
  });

  it("only returns competitions that pass the filter", () => {
    const event = makeEvent([{ date: FUTURE_DATE }, { date: PAST_DATE }]);
    const result = filterFifaEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
    expect(result!.competitions[0].date).toBe(FUTURE_DATE);
  });
});

describe("filterFifaEvents", () => {
  it("filters an array of events, dropping those with no remaining competitions", () => {
    const futureEvent = makeEvent([{ date: FUTURE_DATE }]);
    const pastEvent = makeEvent([{ id: "2", date: PAST_DATE }]);
    const result = filterFifaEvents([futureEvent, pastEvent], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].competitions[0].date).toBe(FUTURE_DATE);
  });

  it("returns empty array when all events are filtered out", () => {
    const pastEvent = makeEvent([{ date: PAST_DATE }]);
    expect(
      filterFifaEvents([pastEvent], { showPastEvents: false, teamIds: [] })
    ).toEqual([]);
  });

  it("returns all events when nothing is filtered", () => {
    const events = [makeEvent(), makeEvent()];
    expect(filterFifaEvents(events, noFilters)).toHaveLength(2);
  });
});

describe("toggleShowPastEvents", () => {
  it("flips showPastEvents from false to true", () => {
    const setFilters = vi.fn();
    const filters: FifaEventFilters = { showPastEvents: false, teamIds: [] };
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: [],
    });
  });
});

describe("toggleTeamFilter", () => {
  it("adds a team when it is not currently selected", () => {
    const setFilters = vi.fn();
    const filters: FifaEventFilters = { showPastEvents: true, teamIds: ["1"] };
    toggleTeamFilter("2", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["1", "2"],
    });
  });

  it("removes a team when it is already selected", () => {
    const setFilters = vi.fn();
    const filters: FifaEventFilters = {
      showPastEvents: true,
      teamIds: ["1", "2"],
    };
    toggleTeamFilter("1", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["2"],
    });
  });
});
