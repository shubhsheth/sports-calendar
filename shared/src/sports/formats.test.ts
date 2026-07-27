import {
  SPORT_FORMATS,
  RACING_SESSION_FORMATS,
  UNKNOWN_RACING_SESSION_MINUTES,
  getDurationMinutes,
  getRacingSessionMinutes,
} from "./formats.ts";

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
    ["cricket", "t20i", 240],
    ["cricket", "t20", 240],
    ["cricket", "other", 240],
    ["racing", "practice", 60],
    ["racing", "qualifying", 60],
    ["racing", "race", 120],
    ["racing", "sprintQualifying", 45],
    ["racing", "sprint", 30],
  ] as const)("holds %s/%s at %i minutes", (sport, format, expected) => {
    expect(DURATIONS[sport][format]).toBe(expected);
  });

  it("resolves a typed pair through getDurationMinutes, one per sport", () => {
    expect(getDurationMinutes("basketball", "standard")).toBe(150);
    expect(getDurationMinutes("football", "standard")).toBe(210);
    expect(getDurationMinutes("soccer", "standard")).toBe(120);
    expect(getDurationMinutes("cricket", "test")).toBe(7200);
    expect(getDurationMinutes("racing", "race")).toBe(120);
  });

  it("keys by sport, never by league", () => {
    // The point of the module: a league is not a unit of duration, so adding a
    // league of an existing sport must require no change here.
    expect(Object.keys(SPORT_FORMATS).sort()).toEqual([
      "basketball",
      "cricket",
      "football",
      "racing",
      "soccer",
    ]);
  });

  it("keeps franchise and international T20 separate at the same duration", () => {
    // Same number, different competition class. Merging them would either
    // misname the IPL as international or force renaming `t20i`, which is a
    // persisted filter value.
    expect(SPORT_FORMATS.cricket.t20).toBe(SPORT_FORMATS.cricket.t20i);
    expect(Object.keys(SPORT_FORMATS.cricket)).toContain("t20");
    expect(Object.keys(SPORT_FORMATS.cricket)).toContain("t20i");
  });
});

describe("getRacingSessionMinutes", () => {
  it.each([
    ["1", 60],
    ["2", 60],
    ["3", 120],
    ["5", 45],
    ["6", 30],
  ])("maps ESPN session id %s to %i minutes", (id, expected) => {
    expect(getRacingSessionMinutes(id)).toBe(expected);
  });

  it("falls back for a session id the app has never seen", () => {
    expect(getRacingSessionMinutes("99")).toBe(UNKNOWN_RACING_SESSION_MINUTES);
    expect(getRacingSessionMinutes("")).toBe(UNKNOWN_RACING_SESSION_MINUTES);
  });

  it("maps every known session id to a real racing format", () => {
    for (const format of Object.values(RACING_SESSION_FORMATS)) {
      expect(SPORT_FORMATS.racing[format]).toBeGreaterThan(0);
    }
  });
});
