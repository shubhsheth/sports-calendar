import type { IplEvent, IplEventFilters } from "@sports-calendar/shared";
import {
  filterIplEvent,
  filterIplEvents,
  toggleShowPastEvents,
  toggleTeamFilter,
} from "./filterIplEvents";

// Dates relative to the test environment
const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

function makeEvent(overrides: Partial<IplEvent> = {}): IplEvent {
  return {
    id: "1527690",
    uid: "s:200~e:1527690~c:1527690",
    date: FUTURE_DATE,
    timeValid: true,
    name: "Punjab Kings v Sunrisers Hyderabad",
    shortName: "PBKS v SRH",
    fullStatus: {
      type: {
        id: "0",
        state: "pre",
        description: "Scheduled",
        detail: "Scheduled",
        shortDetail: "Scheduled",
      },
      summary: "Starts at 15:30 local time",
      longSummary: "Match scheduled to begin at 15:30 local time (10:00 GMT)",
    },
    competitors: [
      {
        id: "335973",
        uid: "s:200~t:335973",
        order: 1,
        homeAway: "home",
        winner: false,
        displayName: "Punjab Kings",
        abbreviation: "PBKS",
        score: "",
        logo: "https://a.espncdn.com/i/teamlogos/cricket/500/335973.png",
      },
      {
        id: "628333",
        uid: "s:200~t:628333",
        order: 2,
        homeAway: "away",
        winner: false,
        displayName: "Sunrisers Hyderabad",
        abbreviation: "SRH",
        score: "",
        logo: "https://a.espncdn.com/i/teamlogos/cricket/500/628333.png",
      },
    ],
    ...overrides,
  };
}

const noFilters: IplEventFilters = { showPastEvents: true, teamIds: [] };

describe("filterIplEvent", () => {
  it("returns the event unchanged when no filters are active", () => {
    const event = makeEvent();
    expect(filterIplEvent(event, noFilters)).toEqual(event);
  });

  it("keeps future events when showPastEvents is false", () => {
    const event = makeEvent({ date: FUTURE_DATE });
    const result = filterIplEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).not.toBeNull();
    expect(result).toEqual(event);
  });

  it("removes past events when showPastEvents is false", () => {
    const event = makeEvent({ date: PAST_DATE });
    const result = filterIplEvent(event, {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toBeNull();
  });

  it("keeps past events when showPastEvents is true", () => {
    const event = makeEvent({ date: PAST_DATE });
    const result = filterIplEvent(event, { showPastEvents: true, teamIds: [] });
    expect(result).not.toBeNull();
  });

  it("keeps event when a selected team is a home competitor", () => {
    const event = makeEvent();
    const result = filterIplEvent(event, {
      showPastEvents: true,
      teamIds: ["335973"],
    });
    expect(result).not.toBeNull();
  });

  it("keeps event when a selected team is an away competitor", () => {
    const event = makeEvent();
    const result = filterIplEvent(event, {
      showPastEvents: true,
      teamIds: ["628333"],
    });
    expect(result).not.toBeNull();
  });

  it("removes event when no selected team is a competitor", () => {
    const event = makeEvent();
    const result = filterIplEvent(event, {
      showPastEvents: true,
      teamIds: ["999999"],
    });
    expect(result).toBeNull();
  });

  it("shows all events when teamIds is empty (no team filter)", () => {
    const event = makeEvent();
    const result = filterIplEvent(event, { showPastEvents: true, teamIds: [] });
    expect(result).not.toBeNull();
  });
});

describe("filterIplEvents", () => {
  it("filters an array keeping only passing events", () => {
    const futureEvent = makeEvent({ id: "1", date: FUTURE_DATE });
    const pastEvent = makeEvent({ id: "2", date: PAST_DATE });
    const result = filterIplEvents([futureEvent, pastEvent], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns empty array when all events are filtered out", () => {
    const pastEvent = makeEvent({ date: PAST_DATE });
    expect(
      filterIplEvents([pastEvent], { showPastEvents: false, teamIds: [] })
    ).toEqual([]);
  });

  it("returns all events when nothing is filtered", () => {
    const events = [makeEvent({ id: "1" }), makeEvent({ id: "2" })];
    expect(filterIplEvents(events, noFilters)).toHaveLength(2);
  });
});

describe("toggleShowPastEvents", () => {
  it("flips showPastEvents from false to true", () => {
    const setFilters = vi.fn();
    const filters: IplEventFilters = { showPastEvents: false, teamIds: [] };
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: [],
    });
  });

  it("flips showPastEvents from true to false", () => {
    const setFilters = vi.fn();
    const filters: IplEventFilters = { showPastEvents: true, teamIds: [] };
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: false,
      teamIds: [],
    });
  });
});

describe("toggleTeamFilter", () => {
  it("adds a team when it is not currently selected", () => {
    const setFilters = vi.fn();
    const filters: IplEventFilters = {
      showPastEvents: true,
      teamIds: ["335973"],
    };
    toggleTeamFilter("628333", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["335973", "628333"],
    });
  });

  it("removes a team when it is already selected", () => {
    const setFilters = vi.fn();
    const filters: IplEventFilters = {
      showPastEvents: true,
      teamIds: ["335973", "628333"],
    };
    toggleTeamFilter("335973", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["628333"],
    });
  });

  it("adds a team to an empty teamIds list", () => {
    const setFilters = vi.fn();
    const filters: IplEventFilters = { showPastEvents: true, teamIds: [] };
    toggleTeamFilter("335973", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["335973"],
    });
  });
});
