import type { NbaEventFilters } from "@sports-calendar/shared";
import { toggleShowPastEvents, toggleTeamFilter } from "./filterNbaEvents";

describe("toggleShowPastEvents", () => {
  it("flips showPastEvents from false to true", () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = { showPastEvents: false, teamIds: [] };
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: [],
    });
  });

  it("flips showPastEvents from true to false", () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = { showPastEvents: true, teamIds: [] };
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
    const filters: NbaEventFilters = { showPastEvents: true, teamIds: ["1"] };
    toggleTeamFilter("2", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["1", "2"],
    });
  });

  it("removes a team when it is already selected", () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = {
      showPastEvents: true,
      teamIds: ["1", "2"],
    };
    toggleTeamFilter("1", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["2"],
    });
  });

  it("adds a team to an empty teamIds list", () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = { showPastEvents: true, teamIds: [] };
    toggleTeamFilter("5", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["5"],
    });
  });
});
