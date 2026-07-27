import { SPORT_FORMATS, getDurationMinutes } from "./formats.ts";

// Widened view so the parity table below can iterate sport/format pairs. A
// generic call cannot take a union of sports — `SportFormat<S>` collapses to
// `never` — which is the type safety working, so the table checks the data and
// the typed calls below exercise the helper.
const DURATIONS: Record<string, Record<string, number>> = SPORT_FORMATS;

describe("SPORT_FORMATS", () => {
  // These are the values the per-league constants held before consolidation.
  // They are asserted literally so a typo during migration fails here rather
  // than silently changing when events drop off a schedule.
  it.each([
    ["basketball", "standard", 150],
    ["football", "standard", 210],
    ["soccer", "standard", 120],
    ["cricket", "test", 7200],
    ["cricket", "odi", 480],
    ["cricket", "t20", 240],
    ["cricket", "other", 240],
    ["f1", "practice", 60],
    ["f1", "qualifying", 60],
    ["f1", "race", 120],
    ["f1", "sprintQualifying", 45],
    ["f1", "sprint", 30],
  ] as const)("holds %s/%s at %i minutes", (sport, format, expected) => {
    expect(DURATIONS[sport][format]).toBe(expected);
  });

  it("keys by sport, with f1 as the documented exception", () => {
    // Duration is a property of the game, so a new league of an existing sport
    // needs no entry here. Motorsport is the exception: session lengths are
    // series-specific, so keying it by sport would assert something false
    // about every series that is not F1.
    expect(Object.keys(SPORT_FORMATS).sort()).toEqual([
      "basketball",
      "cricket",
      "f1",
      "football",
      "soccer",
    ]);
  });

  it("carries one T20 format, shared by internationals and franchise cricket", () => {
    expect(Object.keys(SPORT_FORMATS.cricket)).toEqual([
      "test",
      "odi",
      "t20",
      "other",
    ]);
  });
});

describe("getDurationMinutes", () => {
  it("resolves a typed pair, one per sport", () => {
    expect(getDurationMinutes("cricket", "test")).toBe(7200);
    expect(getDurationMinutes("f1", "race")).toBe(120);
  });

  it("lets a single-format sport omit the format name", () => {
    expect(getDurationMinutes("basketball")).toBe(150);
    expect(getDurationMinutes("football")).toBe(210);
    expect(getDurationMinutes("soccer")).toBe(120);
  });
});
