import type { F1Event, F1EventCompetition, F1EventFilters } from "@sports-calendar/shared";
import {
  filterF1Event,
  filterF1Events,
  toggleEventType,
  toggleShowPastEvents,
} from "./filterF1Events";

const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

const BASE_COMPETITION: F1EventCompetition = {
  $ref: "https://sports.core.api.espn.com/v2/sports/racing/leagues/f1/events/1/competitions/1",
  id: "1",
  date: FUTURE_DATE,
  type: { id: "3", text: "Race", abbreviation: "Race" },
  timeValid: true,
  recent: false,
  bracketAvailable: false,
  gameSource: { id: "0", description: "Unknown", state: "full" },
  status: { $ref: "https://status" },
  session: 5,
};

function makeEvent(
  competitions: Partial<F1EventCompetition>[] = [{}]
): F1Event {
  return {
    $ref: "https://event",
    id: "1",
    date: FUTURE_DATE,
    name: "Bahrain Grand Prix",
    shortName: "Bahrain GP",
    season: { $ref: "https://season" },
    competitions: competitions.map(overrides => ({
      ...BASE_COMPETITION,
      ...overrides,
    })),
  };
}

const allTypesFilter: F1EventFilters = {
  showPastEvents: true,
  types: ["1", "2", "3", "4", "6"],
};

describe("filterF1Event", () => {
  it("returns the event unchanged when no filters are active", () => {
    const event = makeEvent();
    expect(filterF1Event(event, allTypesFilter)).toEqual(event);
  });

  it("keeps competitions whose type is in the filter list", () => {
    const event = makeEvent([{ type: { ...BASE_COMPETITION.type, id: "3" } }]);
    const result = filterF1Event(event, {
      showPastEvents: true,
      types: ["3"],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it("removes competitions whose type is not in the filter list", () => {
    const event = makeEvent([{ type: { ...BASE_COMPETITION.type, id: "1" } }]);
    const result = filterF1Event(event, {
      showPastEvents: true,
      types: ["2", "3"],
    });
    expect(result).toBeNull();
  });

  it("removes past competitions when showPastEvents is false", () => {
    const event = makeEvent([{ date: PAST_DATE }]);
    const result = filterF1Event(event, {
      showPastEvents: false,
      types: ["3"],
    });
    expect(result).toBeNull();
  });

  it("keeps past competitions when showPastEvents is true", () => {
    const event = makeEvent([{ date: PAST_DATE }]);
    const result = filterF1Event(event, {
      showPastEvents: true,
      types: ["3"],
    });
    expect(result).not.toBeNull();
  });

  it("applies both time and type filters simultaneously", () => {
    const event = makeEvent([
      { date: FUTURE_DATE, type: { ...BASE_COMPETITION.type, id: "3" } }, // passes both
      { id: "2", date: PAST_DATE, type: { ...BASE_COMPETITION.type, id: "3" } }, // fails time
      {
        id: "3",
        date: FUTURE_DATE,
        type: { ...BASE_COMPETITION.type, id: "1" },
      }, // fails type
    ]);
    const result = filterF1Event(event, {
      showPastEvents: false,
      types: ["3"],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
    expect(result!.competitions[0].type.id).toBe("3");
  });

  it("returns null when all competitions are filtered out", () => {
    const event = makeEvent([
      { date: PAST_DATE },
      { id: "2", date: PAST_DATE },
    ]);
    expect(
      filterF1Event(event, { showPastEvents: false, types: ["3"] })
    ).toBeNull();
  });
});

describe("filterF1Events", () => {
  it("filters an array, dropping events with no remaining competitions", () => {
    const visibleEvent = makeEvent([{ date: FUTURE_DATE }]);
    const hiddenEvent = makeEvent([{ id: "2", date: PAST_DATE }]);
    const result = filterF1Events([visibleEvent, hiddenEvent], {
      showPastEvents: false,
      types: ["3"],
    });
    expect(result).toHaveLength(1);
  });

  it("returns empty array when all events are filtered out", () => {
    expect(
      filterF1Events([makeEvent([{ date: PAST_DATE }])], {
        showPastEvents: false,
        types: ["3"],
      })
    ).toEqual([]);
  });
});

describe("toggleShowPastEvents", () => {
  it("flips showPastEvents from false to true", () => {
    const setFilters = vi.fn();
    const filters: F1EventFilters = { showPastEvents: false, types: ["3"] };
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      types: ["3"],
    });
  });

  it("flips showPastEvents from true to false", () => {
    const setFilters = vi.fn();
    const filters: F1EventFilters = { showPastEvents: true, types: ["3"] };
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: false,
      types: ["3"],
    });
  });
});

describe("toggleEventType", () => {
  it("adds a type when it is not currently selected", () => {
    const setFilters = vi.fn();
    const filters: F1EventFilters = { showPastEvents: true, types: ["3"] };
    toggleEventType("2", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      types: ["3", "2"],
    });
  });

  it("removes a type when it is already selected", () => {
    const setFilters = vi.fn();
    const filters: F1EventFilters = { showPastEvents: true, types: ["2", "3"] };
    toggleEventType("2", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      types: ["3"],
    });
  });

  it("adds a type to an empty types list", () => {
    const setFilters = vi.fn();
    const filters: F1EventFilters = { showPastEvents: true, types: [] };
    toggleEventType("3", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      types: ["3"],
    });
  });
});
