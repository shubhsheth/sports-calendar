import { describe, it, expect } from "vitest";
import {
  parseCricketTeamParams,
  parseNbaParams,
  parseNflParams,
  parseIplParams,
  parseFifaParams,
  parseF1Params,
} from "./params";

describe("parseNbaParams (team-filtered leagues)", () => {
  it("parses valid params to { ok: true }", () => {
    const result = parseNbaParams({ teamIds: "9,14" });
    expect(result).toEqual({
      ok: true,
      value: { showPastEvents: true, teamIds: ["9", "14"] },
    });
  });

  it("always shows past events, ignoring the showPastEvents param", () => {
    expect(parseNbaParams({ showPastEvents: "false" })).toEqual({
      ok: true,
      value: { showPastEvents: true, teamIds: [] },
    });
  });

  it("treats empty teamIds as no filter", () => {
    const result = parseNbaParams({ teamIds: "" });
    expect(result.ok && result.value.teamIds).toEqual([]);
  });

  it("does not reject an unrecognized showPastEvents value", () => {
    expect(parseNbaParams({ showPastEvents: "maybe" }).ok).toBe(true);
  });

  it("nfl, ipl and fifa share the same team-filter parsing", () => {
    expect(parseNflParams({ teamIds: "1" }).ok).toBe(true);
    expect(parseIplParams({ showPastEvents: "nope" }).ok).toBe(true);
    expect(parseFifaParams({ teamIds: "202,164" })).toEqual({
      ok: true,
      value: { showPastEvents: true, teamIds: ["202", "164"] },
    });
  });
});

describe("parseF1Params", () => {
  it("parses valid session types to { ok: true }", () => {
    expect(parseF1Params({ types: "2,3" })).toEqual({
      ok: true,
      value: { showPastEvents: true, types: ["2", "3"] },
    });
  });

  it("defaults to all valid session types when types is absent", () => {
    const result = parseF1Params({});
    expect(result.ok && result.value.types).toEqual(["1", "2", "3", "5", "6"]);
  });

  it("rejects an invalid session type id with { ok: false }", () => {
    expect(parseF1Params({ types: "2,4" }).ok).toBe(false);
  });

  it("does not reject an unrecognized showPastEvents value", () => {
    expect(parseF1Params({ showPastEvents: "nope" }).ok).toBe(true);
  });
});

describe("parseCricketTeamParams", () => {
  it("accepts a curated team with no format filter", () => {
    expect(parseCricketTeamParams("6", {})).toEqual({
      ok: true,
      value: { showPastEvents: true, formats: [] },
    });
  });

  it("parses and validates formats", () => {
    expect(parseCricketTeamParams("6", { formats: "test,odi" })).toEqual({
      ok: true,
      value: { showPastEvents: true, formats: ["test", "odi"] },
    });
    const bad = parseCricketTeamParams("6", { formats: "test,t10" });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.error).toContain("t10");
  });

  it("rejects teams outside the curated list", () => {
    const result = parseCricketTeamParams("999", {});
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("999");
  });
});
