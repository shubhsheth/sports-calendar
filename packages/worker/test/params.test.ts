import { describe, it, expect } from "vitest";
import { parseNbaParams, parseNflParams, parseF1Params, parseIplParams } from "../src/params.ts";

describe("parseNbaParams", () => {
  it("defaults showPastEvents to true", () => {
    const result = parseNbaParams({});
    expect(result).toEqual({ ok: true, value: { showPastEvents: true, teamIds: [] } });
  });

  it("parses showPastEvents=false", () => {
    const result = parseNbaParams({ showPastEvents: "false" });
    expect(result).toMatchObject({ ok: true, value: { showPastEvents: false } });
  });

  it("returns error for invalid showPastEvents", () => {
    const result = parseNbaParams({ showPastEvents: "maybe" });
    expect(result).toMatchObject({ ok: false });
  });

  it("parses comma-separated teamIds", () => {
    const result = parseNbaParams({ teamIds: "10,20,30" });
    expect(result).toMatchObject({ ok: true, value: { teamIds: ["10", "20", "30"] } });
  });

  it("returns empty teamIds for empty string", () => {
    const result = parseNbaParams({ teamIds: "" });
    expect(result).toMatchObject({ ok: true, value: { teamIds: [] } });
  });
});

describe("parseF1Params", () => {
  it("defaults to all session types when types not provided", () => {
    const result = parseF1Params({});
    expect(result).toMatchObject({ ok: true, value: { types: ["1", "2", "3", "4", "6"] } });
  });

  it("parses valid types", () => {
    const result = parseF1Params({ types: "2,3" });
    expect(result).toMatchObject({ ok: true, value: { types: ["2", "3"] } });
  });

  it("returns error for invalid type", () => {
    const result = parseF1Params({ types: "2,99" });
    expect(result).toMatchObject({ ok: false });
  });

  it("returns error for invalid showPastEvents", () => {
    const result = parseF1Params({ showPastEvents: "invalid" });
    expect(result).toMatchObject({ ok: false });
  });
});

describe("parseNflParams", () => {
  it("parses valid params", () => {
    const result = parseNflParams({ showPastEvents: "true", teamIds: "1" });
    expect(result).toEqual({ ok: true, value: { showPastEvents: true, teamIds: ["1"] } });
  });
});

describe("parseIplParams", () => {
  it("parses valid params", () => {
    const result = parseIplParams({ showPastEvents: "false", teamIds: "abc" });
    expect(result).toEqual({ ok: true, value: { showPastEvents: false, teamIds: ["abc"] } });
  });
});
