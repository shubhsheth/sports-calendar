import { describe, expect, it, vi } from "vitest";
import type { CricketTeamFilters } from "@sports-calendar/shared";
import { toggleFormatFilter, toggleShowPastEvents } from "./filterState";

const base: CricketTeamFilters = { showPastEvents: false, formats: [] };

describe("toggleFormatFilter", () => {
  it("adds an unselected format", () => {
    const setFilters = vi.fn();
    toggleFormatFilter("test", base, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: false,
      formats: ["test"],
    });
  });

  it("removes a selected format", () => {
    const setFilters = vi.fn();
    toggleFormatFilter(
      "odi",
      { ...base, formats: ["test", "odi"] },
      setFilters
    );
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: false,
      formats: ["test"],
    });
  });
});

describe("toggleShowPastEvents", () => {
  it("flips the flag without touching formats", () => {
    const setFilters = vi.fn();
    toggleShowPastEvents({ ...base, formats: ["t20i"] }, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      formats: ["t20i"],
    });
  });
});
