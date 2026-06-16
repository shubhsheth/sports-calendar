import { describe, it, expect } from "vitest";
import { transformFifaEventsToIcs } from "./transform.ts";
import type { FifaEvent } from "./types.ts";

function makeEvent(overrides: Partial<FifaEvent> = {}): FifaEvent {
  return {
    $ref: "https://event",
    id: "1",
    date: "2026-06-15T19:30:00Z",
    name: "Brazil at Argentina",
    shortName: "BRA @ ARG",
    season: { $ref: "https://season" },
    competitions: [
      {
        $ref: "https://comp",
        id: "1",
        date: "2026-06-15T19:30:00Z",
        type: { id: "2", text: "Group Stage", abbreviation: "GRP" },
        timeValid: true,
        recent: false,
        bracketAvailable: false,
        gameSource: { id: "0", description: "Unknown", state: "full" },
        venue: {
          $ref: "https://venue",
          fullName: "SoFi Stadium",
          address: { city: "Inglewood", country: "USA" },
        },
        competitors: [],
      },
    ],
    ...overrides,
  };
}

describe("transformFifaEventsToIcs", () => {
  it("returns an empty array for no events", () => {
    expect(transformFifaEventsToIcs([])).toEqual([]);
  });

  it("produces one calendar entry per competition", () => {
    const event = makeEvent({
      competitions: [
        { ...makeEvent().competitions[0], id: "1" },
        { ...makeEvent().competitions[0], id: "2" },
      ],
    });
    expect(transformFifaEventsToIcs([event])).toHaveLength(2);
  });

  it('formats the title as "FIFA: {shortName}"', () => {
    const [entry] = transformFifaEventsToIcs([makeEvent()]);
    expect(entry.title).toBe("FIFA: BRA @ ARG");
  });

  it("sets a stable uid and a descriptive description", () => {
    const [entry] = transformFifaEventsToIcs([makeEvent()]);
    expect(entry.uid).toBe("1@sports-calendar");
    expect(entry.description).toBe("FIFA: Brazil at Argentina — full");
  });

  it("sets duration to 2 hours", () => {
    const [entry] = transformFifaEventsToIcs([makeEvent()]);
    expect((entry as { duration?: unknown }).duration).toEqual({
      hours: 2,
      minutes: 0,
    });
  });

  it("produces a start array with 5 numeric elements", () => {
    const [entry] = transformFifaEventsToIcs([makeEvent()]);
    expect(Array.isArray(entry.start)).toBe(true);
    const start = entry.start as number[];
    expect(start).toHaveLength(5);
    start.forEach(v => expect(typeof v).toBe("number"));
  });

  it("processes multiple events, one entry each", () => {
    const events = [
      makeEvent({ id: "1", shortName: "BRA @ ARG" }),
      makeEvent({ id: "2", shortName: "FRA @ ENG" }),
    ];
    const result = transformFifaEventsToIcs(events);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("FIFA: BRA @ ARG");
    expect(result[1].title).toBe("FIFA: FRA @ ENG");
  });
});
