import type { IplEventFilters } from "@sports-calendar/shared";
import { toggleShowPastEvents, toggleTeamFilter } from "./filterIplEvents";

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
