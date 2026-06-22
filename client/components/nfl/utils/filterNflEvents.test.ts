import type { NflEventFilters } from "@sports-calendar/shared";
import { toggleShowPastEvents, toggleTeamFilter } from "./filterNflEvents";

describe("toggleShowPastEvents", () => {
  it("flips showPastEvents from false to true", () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = { showPastEvents: false, teamIds: [] };
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: [],
    });
  });

  it("flips showPastEvents from true to false", () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = { showPastEvents: true, teamIds: [] };
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
    const filters: NflEventFilters = { showPastEvents: true, teamIds: ["17"] };
    toggleTeamFilter("25", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["17", "25"],
    });
  });

  it("removes a team when it is already selected", () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = {
      showPastEvents: true,
      teamIds: ["17", "25"],
    };
    toggleTeamFilter("17", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["25"],
    });
  });

  it("adds a team to an empty teamIds list", () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = { showPastEvents: true, teamIds: [] };
    toggleTeamFilter("17", filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ["17"],
    });
  });
});
