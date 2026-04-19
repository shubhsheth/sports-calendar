import { describe, it, expect, vi, beforeEach } from "vitest";
import { filterF1Events } from "./f1.ts";
import type { F1Event, F1EventFilters } from "../types/f1.ts";
import * as eventStatus from "../lib/eventStatus.ts";

function makeF1Event(typeIds: string[] = ["3"]): F1Event {
  return {
    $ref: "",
    id: "1",
    date: "2026-04-01T00:00:00Z",
    name: "Australian Grand Prix",
    shortName: "Australian GP",
    season: { $ref: "" },
    competitions: typeIds.map((id, i) => ({
      $ref: "",
      id: `c${i}`,
      date: "2026-04-01T00:00:00Z",
      type: { id, text: id, abbreviation: id },
      timeValid: true,
      recent: false,
      bracketAvailable: false,
      gameSource: { id: "1", description: "ESPN", state: "full" },
      status: { $ref: "" },
      session: i + 1,
    })),
  };
}

const defaultFilters: F1EventFilters = { showPastEvents: true, types: ["1", "2", "3", "4", "6"] };

describe("filterF1Events", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns all sessions when all types included", () => {
    const events = [makeF1Event(["1", "2", "3"])];
    expect(filterF1Events(events, defaultFilters)[0]?.competitions).toHaveLength(3);
  });

  it("filters to only specified types", () => {
    const events = [makeF1Event(["1", "2", "3"])];
    const result = filterF1Events(events, { ...defaultFilters, types: ["3"] });
    expect(result[0]?.competitions).toHaveLength(1);
    expect(result[0]?.competitions[0]?.type.id).toBe("3");
  });

  it("removes event entirely when no sessions match type filter", () => {
    const events = [makeF1Event(["1", "2"])];
    const result = filterF1Events(events, { ...defaultFilters, types: ["3"] });
    expect(result).toHaveLength(0);
  });

  it("removes past sessions when showPastEvents=false", () => {
    vi.spyOn(eventStatus, "isEventPast").mockReturnValue(true);
    const events = [makeF1Event(["3"])];
    const result = filterF1Events(events, { ...defaultFilters, showPastEvents: false });
    expect(result).toHaveLength(0);
  });
});
