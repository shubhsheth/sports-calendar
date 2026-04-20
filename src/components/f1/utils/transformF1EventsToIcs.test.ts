import type { F1Event } from "@/types/f1";
import { transformF1EventsToIcs } from "./transformF1EventsToIcs";

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
        gameSource: { id: "0", description: "Unknown", state: "full" },
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

  it("sets duration based on session type (race = 2h, qualifying = 1h)", () => {
    const [race] = transformF1EventsToIcs([makeEvent()]);
    expect(race.duration).toEqual({ hours: 2, minutes: 0 });

    const qualEvent = makeEvent({
      competitions: [
        {
          ...makeEvent().competitions[0],
          type: { id: "2", text: "Qualifying", abbreviation: "Qual" },
        },
      ],
    });
    const [qual] = transformF1EventsToIcs([qualEvent]);
    expect(qual.duration).toEqual({ hours: 1, minutes: 0 });
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
