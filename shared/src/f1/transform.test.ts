import { describe, it, expect } from "vitest";
import { transformF1EventsToIcs, cleanUpF1SponsorNames } from "./transform.ts";
import type { F1Event } from "./types.ts";

function makeEvent(overrides: Partial<F1Event> = {}): F1Event {
  return {
    $ref: "https://event",
    id: "1",
    date: "2026-03-20T15:00:00Z",
    name: "Qatar Airways Australian Grand Prix",
    shortName: "Qatar Airways Australian GP",
    season: { $ref: "https://season" },
    competitions: [
      {
        $ref: "https://comp",
        id: "1",
        date: "2026-03-22T05:00:00Z",
        type: { id: "3", text: "Race", abbreviation: "Race" },
        timeValid: true,
        recent: false,
        bracketAvailable: false,
        status: { $ref: "https://status" },
        session: 5,
      },
    ],
    ...overrides,
  };
}

describe("transformF1EventsToIcs", () => {
  it("returns an empty array for no events", () => {
    expect(transformF1EventsToIcs([])).toEqual([]);
  });

  it("produces one calendar entry per competition", () => {
    const event = makeEvent({
      competitions: [
        { ...makeEvent().competitions[0], id: "1" },
        { ...makeEvent().competitions[0], id: "2" },
      ],
    });
    expect(transformF1EventsToIcs([event])).toHaveLength(2);
  });

  it("formats the title using the translated abbreviation and cleaned event name", () => {
    const event = makeEvent({
      shortName: "Qatar Airways Australian GP",
      competitions: [
        {
          ...makeEvent().competitions[0],
          type: { id: "3", text: "Race", abbreviation: "Race" },
        },
      ],
    });
    // "Race" abbreviation falls through to default (returns "Race")
    // "Qatar Airways Australian GP" → "Australian GP" after sponsor cleanup
    const [entry] = transformF1EventsToIcs([event]);
    expect(entry.title).toBe("F1: Race (Australian GP)");
  });

  it("translates a known abbreviation in the title", () => {
    const event = makeEvent({
      shortName: "Bahrain GP",
      competitions: [
        {
          ...makeEvent().competitions[0],
          type: { id: "2", text: "Qualifying", abbreviation: "Qual" },
        },
      ],
    });
    const [entry] = transformF1EventsToIcs([event]);
    expect(entry.title).toBe("F1: Qualifying (Bahrain GP)");
  });

  it("strips sponsor prefix from the event shortName in the title", () => {
    const event = makeEvent({
      shortName: "Heineken Dutch GP",
      competitions: [
        {
          ...makeEvent().competitions[0],
          type: { id: "3", text: "Race", abbreviation: "Race" },
        },
      ],
    });
    const [entry] = transformF1EventsToIcs([event]);
    expect(entry.title).toBe("F1: Race (Dutch GP)");
  });

  it("sets a stable uid and a translated description", () => {
    const [entry] = transformF1EventsToIcs([makeEvent()]);
    expect(entry.uid).toBe("1@sports-calendar");
    expect(entry.description).toBe("F1: Australian Grand Prix — Race");
  });

  it("sets duration based on session type (race = 2h, qualifying = 1h)", () => {
    const [race] = transformF1EventsToIcs([makeEvent()]);
    expect((race as { duration?: unknown }).duration).toEqual({
      hours: 2,
      minutes: 0,
    });

    const qualEvent = makeEvent({
      competitions: [
        {
          ...makeEvent().competitions[0],
          type: { id: "2", text: "Qualifying", abbreviation: "Qual" },
        },
      ],
    });
    const [qual] = transformF1EventsToIcs([qualEvent]);
    expect((qual as { duration?: unknown }).duration).toEqual({
      hours: 1,
      minutes: 0,
    });
  });

  it("produces a start array with 5 numeric elements", () => {
    const [entry] = transformF1EventsToIcs([makeEvent()]);
    const start = entry.start as number[];
    expect(start).toHaveLength(5);
    start.forEach(v => expect(typeof v).toBe("number"));
  });

  it("processes multiple events", () => {
    const events = [
      makeEvent({ id: "1", shortName: "Australian GP" }),
      makeEvent({ id: "2", shortName: "Bahrain GP" }),
    ];
    const result = transformF1EventsToIcs(events);
    expect(result).toHaveLength(2);
  });
});

describe("cleanUpF1SponsorNames", () => {
  it("strips a known sponsor prefix", () => {
    expect(cleanUpF1SponsorNames("Qatar Airways Bahrain Grand Prix")).toBe(
      "Bahrain Grand Prix"
    );
  });

  it("strips another known sponsor prefix", () => {
    expect(cleanUpF1SponsorNames("Heineken Dutch Grand Prix")).toBe(
      "Dutch Grand Prix"
    );
  });

  it("strips Aramco sponsor", () => {
    expect(cleanUpF1SponsorNames("Aramco Saudi Arabian Grand Prix")).toBe(
      "Saudi Arabian Grand Prix"
    );
  });

  it("leaves names with no known sponsor unchanged", () => {
    expect(cleanUpF1SponsorNames("Australian Grand Prix")).toBe(
      "Australian Grand Prix"
    );
  });

  it("returns empty string for empty input", () => {
    expect(cleanUpF1SponsorNames("")).toBe("");
  });

  it("removes all occurrences of a repeated sponsor", () => {
    expect(cleanUpF1SponsorNames("AWS AWS Monaco Grand Prix")).toBe(
      "Monaco Grand Prix"
    );
  });

  it("trims leading and trailing whitespace after removal", () => {
    const result = cleanUpF1SponsorNames("STC Saudi Arabian Grand Prix");
    expect(result).not.toMatch(/^\s|\s$/);
  });

  it("collapses multiple internal spaces after removal", () => {
    const result = cleanUpF1SponsorNames("Qatar Airways  Bahrain Grand Prix");
    expect(result).not.toMatch(/\s{2,}/);
  });

  it("is case-insensitive when stripping sponsors", () => {
    expect(cleanUpF1SponsorNames("qatar airways Bahrain Grand Prix")).toBe(
      "Bahrain Grand Prix"
    );
  });
});
