import { describe, it, expect } from "vitest";
import { transformNbaEventsToIcs } from "./transform.ts";
import type { NbaEvent } from "./types.ts";

function makeEvent(overrides: Partial<NbaEvent> = {}): NbaEvent {
  return {
    $ref: "https://event",
    id: "1",
    date: "2026-06-15T19:30:00Z",
    name: "Los Angeles Lakers at Boston Celtics",
    shortName: "LAL @ BOS",
    season: { $ref: "https://season" },
    competitions: [
      {
        $ref: "https://comp",
        id: "1",
        date: "2026-06-15T19:30:00Z",
        type: { id: "2", text: "Regular Season", abbreviation: "RS" },
        timeValid: true,
        recent: false,
        bracketAvailable: false,
        gameSource: { id: "0", description: "Unknown", state: "full" },
        venue: {
          $ref: "https://venue",
          fullName: "TD Garden",
          address: { city: "Boston", state: "MA" },
        },
        competitors: [],
      },
    ],
    ...overrides,
  };
}

describe("transformNbaEventsToIcs", () => {
  it("returns an empty array for no events", () => {
    expect(transformNbaEventsToIcs([])).toEqual([]);
  });

  it("produces one calendar entry per competition", () => {
    const event = makeEvent({
      competitions: [
        { ...makeEvent().competitions[0], id: "1" },
        { ...makeEvent().competitions[0], id: "2" },
      ],
    });
    expect(transformNbaEventsToIcs([event])).toHaveLength(2);
  });

  it('formats the title as "NBA: {shortName}"', () => {
    const [entry] = transformNbaEventsToIcs([makeEvent()]);
    expect(entry.title).toBe("NBA: LAL @ BOS");
  });

  it("sets a stable uid and a descriptive description", () => {
    const [entry] = transformNbaEventsToIcs([makeEvent()]);
    expect(entry.uid).toBe("1@sports-calendar");
    expect(entry.description).toBe(
      "NBA: Los Angeles Lakers at Boston Celtics — full"
    );
  });

  it("sets duration to 2 hours 30 minutes", () => {
    const [entry] = transformNbaEventsToIcs([makeEvent()]);
    expect((entry as { duration?: unknown }).duration).toEqual({
      hours: 2,
      minutes: 30,
    });
  });

  it("produces a start array with 5 numeric elements", () => {
    const [entry] = transformNbaEventsToIcs([makeEvent()]);
    expect(Array.isArray(entry.start)).toBe(true);
    const start = entry.start as number[];
    expect(start).toHaveLength(5);
    start.forEach(v => expect(typeof v).toBe("number"));
  });

  it("processes multiple events, one entry each", () => {
    const events = [
      makeEvent({ id: "1", shortName: "LAL @ BOS" }),
      makeEvent({ id: "2", shortName: "GSW @ NYK" }),
    ];
    const result = transformNbaEventsToIcs(events);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("NBA: LAL @ BOS");
    expect(result[1].title).toBe("NBA: GSW @ NYK");
  });
});
