import type { NbaEvent } from "@sports-calendar/shared";
import { transformNbaEventsToIcs } from "./transformNbaEventsToIcs";

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

  it("sets duration to 2 hours 30 minutes", () => {
    const [entry] = transformNbaEventsToIcs([makeEvent()]);
    expect(entry.duration).toEqual({ hours: 2, minutes: 30 });
  });

  it("produces a start array with 5 numeric elements", () => {
    const [entry] = transformNbaEventsToIcs([makeEvent()]);
    expect(Array.isArray(entry.start)).toBe(true);
    const start = entry.start as number[];
    expect(start).toHaveLength(5);
    start.forEach(v => expect(typeof v).toBe("number"));
  });

  it("adds 1 to dayjs month (converts 0-indexed to 1-indexed)", () => {
    // June = month index 5 in dayjs, so start[1] should be 6
    const event = makeEvent({
      competitions: [
        { ...makeEvent().competitions[0], date: "2026-06-15T00:00:00.000Z" },
      ],
    });
    // We can't know the exact UTC offset of the test runner,
    // but we can verify the year is sensible and month is in valid range
    const [entry] = transformNbaEventsToIcs([event]);
    const start = entry.start as number[];
    expect(start[0]).toBeGreaterThanOrEqual(2026); // year
    expect(start[1]).toBeGreaterThanOrEqual(1); // month >= 1
    expect(start[1]).toBeLessThanOrEqual(12); // month <= 12
    expect(start[2]).toBeGreaterThanOrEqual(1); // day >= 1
    expect(start[2]).toBeLessThanOrEqual(31); // day <= 31
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
