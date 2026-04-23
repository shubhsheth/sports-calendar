import { describe, it, expect } from "vitest";
import {
  parseNbaParams,
  parseNflParams,
  parseF1Params,
  parseIplParams,
} from "../src/params.ts";

describe("parseNbaParams", () => {
  it("defaults showPastEvents to true and teamIds to [] when no query", () => {
    const result = parseNbaParams({});
    expect(result).toEqual({
      ok: true,
      value: { showPastEvents: true, teamIds: [] },
    });
  });

  it("parses showPastEvents=true", () => {
    const result = parseNbaParams({ showPastEvents: "true" });
    expect(result).toMatchObject({ ok: true, value: { showPastEvents: true } });
  });

  it("parses showPastEvents=false", () => {
    const result = parseNbaParams({ showPastEvents: "false" });
    expect(result).toMatchObject({
      ok: true,
      value: { showPastEvents: false },
    });
  });

  it("returns error for invalid showPastEvents", () => {
    const result = parseNbaParams({ showPastEvents: "invalid" });
    expect(result.ok).toBe(false);
  });

  it("parses comma-separated teamIds", () => {
    const result = parseNbaParams({ teamIds: "9,13" });
    expect(result).toMatchObject({ ok: true, value: { teamIds: ["9", "13"] } });
  });

  it("treats empty teamIds string as no filter", () => {
    const result = parseNbaParams({ teamIds: "" });
    expect(result).toMatchObject({ ok: true, value: { teamIds: [] } });
  });
});

describe("parseNflParams", () => {
  it("defaults showPastEvents to true and teamIds to []", () => {
    expect(parseNflParams({})).toEqual({
      ok: true,
      value: { showPastEvents: true, teamIds: [] },
    });
  });

  it("returns error for invalid showPastEvents", () => {
    expect(parseNflParams({ showPastEvents: "bad" }).ok).toBe(false);
  });

  it("parses teamIds correctly", () => {
    expect(parseNflParams({ teamIds: "1,2" })).toMatchObject({
      ok: true,
      value: { teamIds: ["1", "2"] },
    });
  });
});

describe("parseF1Params", () => {
  it("defaults to all valid F1 types when types is absent", () => {
    const result = parseF1Params({});
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.value.types).toEqual(["1", "2", "3", "4", "6"]);
    }
  });

  it("parses a subset of valid types", () => {
    const result = parseF1Params({ types: "2,3" });
    expect(result).toMatchObject({ ok: true, value: { types: ["2", "3"] } });
  });

  it("returns error for unknown F1 type", () => {
    expect(parseF1Params({ types: "99" }).ok).toBe(false);
  });

  it("returns error when any type in list is invalid", () => {
    expect(parseF1Params({ types: "1,99" }).ok).toBe(false);
  });

  it("returns error for invalid showPastEvents", () => {
    expect(parseF1Params({ showPastEvents: "bad" }).ok).toBe(false);
  });

  it("parses showPastEvents=false", () => {
    const result = parseF1Params({ showPastEvents: "false" });
    expect(result).toMatchObject({
      ok: true,
      value: { showPastEvents: false },
    });
  });
});

describe("parseIplParams", () => {
  it("defaults showPastEvents to true and teamIds to []", () => {
    expect(parseIplParams({})).toEqual({
      ok: true,
      value: { showPastEvents: true, teamIds: [] },
    });
  });

  it("returns error for invalid showPastEvents", () => {
    expect(parseIplParams({ showPastEvents: "nope" }).ok).toBe(false);
  });

  it("parses teamIds correctly", () => {
    expect(parseIplParams({ teamIds: "pbks,mi" })).toMatchObject({
      ok: true,
      value: { teamIds: ["pbks", "mi"] },
    });
  });
});
