import type { F1EventFilters } from "@sports-calendar/shared";
import { toggleShowPastEvents, toggleEventType } from "./filterF1Events";

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
