import {
  translateF1EventTypeAbbr,
  translateF1EventTypeId,
} from "./translateF1EventType";

describe("translateF1EventTypeAbbr", () => {
  it.each([
    ["FP1", "Free Practice 1"],
    ["FP2", "Free Practice 2"],
    ["FP3", "Free Practice 3"],
    ["Qual", "Qualifying"],
    ["SS", "Sprint Qualifying"],
    ["SR", "Sprint Race"],
  ])("translates %s to %s", (input, expected) => {
    expect(translateF1EventTypeAbbr(input)).toBe(expected);
  });

  it("returns the original string for unknown abbreviations", () => {
    expect(translateF1EventTypeAbbr("Race")).toBe("Race");
    expect(translateF1EventTypeAbbr("XYZ")).toBe("XYZ");
  });
});

describe("translateF1EventTypeId", () => {
  it.each([
    ["1", "Practice"],
    ["2", "Qualifying"],
    ["3", "Race"],
    ["5", "Sprint Qualifying"],
    ["6", "Sprint Race"],
  ])("translates id %s to %s", (input, expected) => {
    expect(translateF1EventTypeId(input)).toBe(expected);
  });

  it('returns "Other" for unknown IDs', () => {
    expect(translateF1EventTypeId("4")).toBe("Other");
    expect(translateF1EventTypeId("99")).toBe("Other");
    expect(translateF1EventTypeId("")).toBe("Other");
  });
});
