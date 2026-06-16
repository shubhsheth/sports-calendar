import type { FifaEventFilters } from "@sports-calendar/shared";
import { toggleShowPastEvents, toggleTeamFilter } from "./filterFifaEvents";

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
