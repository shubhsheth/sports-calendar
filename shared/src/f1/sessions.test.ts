import { UNKNOWN_F1_SESSION_MINUTES, getF1SessionMinutes } from "./sessions.ts";

describe("getF1SessionMinutes", () => {
  // The durations F1_SESSION_DURATIONS held before consolidation.
  it.each([
    ["1", 60],
    ["2", 60],
    ["3", 120],
    ["5", 45],
    ["6", 30],
  ])("maps ESPN session id %s to %i minutes", (id, expected) => {
    expect(getF1SessionMinutes(id)).toBe(expected);
  });

  it("falls back for a session id the app has never seen", () => {
    // Type 4 is the legacy pre-2023 sprint, intentionally unmapped.
    expect(getF1SessionMinutes("4")).toBe(UNKNOWN_F1_SESSION_MINUTES);
    expect(getF1SessionMinutes("99")).toBe(UNKNOWN_F1_SESSION_MINUTES);
    expect(getF1SessionMinutes("")).toBe(UNKNOWN_F1_SESSION_MINUTES);
  });
});
