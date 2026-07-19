import { describe, expect, it } from "vitest";
import {
  EMPTY_HOME_SELECTION,
  hasSelection,
  normalizeSelection,
  toggleFormat,
  toggleLeague,
  toggleTeam,
} from "./selectionState";

describe("toggle helpers", () => {
  it("adds and removes a team", () => {
    const withIndia = toggleTeam(EMPTY_HOME_SELECTION, "6");
    expect(withIndia.teamIds).toEqual(["6"]);
    expect(toggleTeam(withIndia, "6").teamIds).toEqual([]);
  });

  it("adds and removes a league without touching teams", () => {
    const sel = toggleLeague(toggleTeam(EMPTY_HOME_SELECTION, "6"), "nba");
    expect(sel).toMatchObject({ teamIds: ["6"], leagues: ["nba"] });
    expect(toggleLeague(sel, "nba").leagues).toEqual([]);
  });

  it("adds and removes a format", () => {
    const sel = toggleFormat(EMPTY_HOME_SELECTION, "test");
    expect(sel.formats).toEqual(["test"]);
    expect(toggleFormat(sel, "test").formats).toEqual([]);
  });
});

describe("hasSelection", () => {
  it("is false for the empty selection (formats alone don't count)", () => {
    expect(hasSelection(EMPTY_HOME_SELECTION)).toBe(false);
    expect(hasSelection(toggleFormat(EMPTY_HOME_SELECTION, "odi"))).toBe(false);
  });

  it("is true with a team or league selected", () => {
    expect(hasSelection(toggleTeam(EMPTY_HOME_SELECTION, "6"))).toBe(true);
    expect(hasSelection(toggleLeague(EMPTY_HOME_SELECTION, "ipl"))).toBe(true);
  });
});

describe("normalizeSelection", () => {
  it("passes a valid selection through", () => {
    const valid = { teamIds: ["6", "2"], leagues: ["nba"], formats: ["test"] };
    expect(normalizeSelection(valid)).toEqual(valid);
  });

  it("repairs garbage to the empty selection", () => {
    expect(normalizeSelection(null)).toEqual(EMPTY_HOME_SELECTION);
    expect(normalizeSelection("nonsense")).toEqual(EMPTY_HOME_SELECTION);
    expect(normalizeSelection({ teamIds: "6" })).toEqual(EMPTY_HOME_SELECTION);
  });

  it("drops unknown ids from older app versions", () => {
    expect(
      normalizeSelection({
        teamIds: ["6", "999", 42],
        leagues: ["nba", "mlb"],
        formats: ["test", "t10"],
      })
    ).toEqual({ teamIds: ["6"], leagues: ["nba"], formats: ["test"] });
  });
});
