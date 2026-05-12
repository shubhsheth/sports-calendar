import type { NflEvent } from "@sports-calendar/shared";
import { transformNflEventsToIcs } from "./transformNflEventsToIcs";

function makeEvent(overrides: Partial<NflEvent> = {}): NflEvent {
  return {
    $ref: "https://event",
    id: "1",
    date: "2025-09-07T17:00:00Z",
    name: "New England Patriots at Kansas City Chiefs",
    shortName: "NE @ KC",
    season: { $ref: "https://season" },
    competitions: [
      {
        $ref: "https://comp",
        id: "1",
        date: "2025-09-07T17:00:00Z",
        type: { id: "2", text: "Regular Season", abbreviation: "RS" },
        timeValid: true,
        recent: false,
        bracketAvailable: false,
        gameSource: { id: "0", description: "Unknown", state: "full" },
        venue: {
          $ref: "https://venue",
          fullName: "Arrowhead Stadium",
          address: { city: "Kansas City", state: "MO" },
        },
        competitors: [],
      },
    ],
    ...overrides,
  };
}

describe("transformNflEventsToIcs", () => {
  it("returns an empty array for no events", () => {
    expect(transformNflEventsToIcs([])).toEqual([]);
  });

  it("produces one calendar entry per competition", () => {
    const event = makeEvent({
      competitions: [
        { ...makeEvent().competitions[0], id: "1" },
        { ...makeEvent().competitions[0], id: "2" },
      ],
    });
    expect(transformNflEventsToIcs([event])).toHaveLength(2);
  });

  it('formats the title as "NFL: {shortName}"', () => {
    const [entry] = transformNflEventsToIcs([makeEvent()]);
    expect(entry.title).toBe("NFL: NE @ KC");
  });

  it("sets duration to 2 hours 30 minutes", () => {
    const [entry] = transformNflEventsToIcs([makeEvent()]);
    expect(entry.duration).toEqual({ hours: 2, minutes: 30 });
  });

  it("produces a start array with 5 numeric elements", () => {
    const [entry] = transformNflEventsToIcs([makeEvent()]);
    const start = entry.start as number[];
    expect(start).toHaveLength(5);
    start.forEach(v => expect(typeof v).toBe("number"));
  });

  it("processes multiple events, one entry each", () => {
    const events = [
      makeEvent({ id: "1", shortName: "NE @ KC" }),
      makeEvent({ id: "2", shortName: "DAL @ NYG" }),
    ];
    const result = transformNflEventsToIcs(events);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("NFL: NE @ KC");
    expect(result[1].title).toBe("NFL: DAL @ NYG");
  });
});
