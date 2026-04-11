import type { IplEvent } from "@/types/ipl";
import { transformIplEventsToIcs } from "./transformIplEventsToIcs";

function makeEvent(overrides: Partial<IplEvent> = {}): IplEvent {
  return {
    id: "1527690",
    uid: "s:200~e:1527690~c:1527690",
    date: "2026-04-11T10:00:00Z",
    timeValid: true,
    name: "Punjab Kings v Sunrisers Hyderabad",
    shortName: "PBKS v SRH",
    fullStatus: {
      type: {
        id: "0",
        state: "pre",
        description: "Scheduled",
        detail: "Scheduled",
        shortDetail: "Scheduled",
      },
      summary: "Starts at 15:30 local time",
      longSummary: "Match scheduled to begin at 15:30 local time (10:00 GMT)",
    },
    competitors: [],
    ...overrides,
  };
}

describe("transformIplEventsToIcs", () => {
  it("returns an empty array for no events", () => {
    expect(transformIplEventsToIcs([])).toEqual([]);
  });

  it("produces one calendar entry per event", () => {
    const events = [makeEvent({ id: "1" }), makeEvent({ id: "2" })];
    expect(transformIplEventsToIcs(events)).toHaveLength(2);
  });

  it('formats the title as "IPL: {shortName}"', () => {
    const [entry] = transformIplEventsToIcs([makeEvent()]);
    expect(entry.title).toBe("IPL: PBKS v SRH");
  });

  it("sets duration to 4 hours", () => {
    const [entry] = transformIplEventsToIcs([makeEvent()]);
    expect(entry.duration).toEqual({ hours: 4, minutes: 0 });
  });

  it("produces a start array with 5 numeric elements", () => {
    const [entry] = transformIplEventsToIcs([makeEvent()]);
    expect(Array.isArray(entry.start)).toBe(true);
    const start = entry.start as number[];
    expect(start).toHaveLength(5);
    start.forEach(v => expect(typeof v).toBe("number"));
  });

  it("adds 1 to dayjs month (converts 0-indexed to 1-indexed)", () => {
    const event = makeEvent({ date: "2026-06-15T00:00:00.000Z" });
    const [entry] = transformIplEventsToIcs([event]);
    const start = entry.start as number[];
    expect(start[0]).toBeGreaterThanOrEqual(2026); // year
    expect(start[1]).toBeGreaterThanOrEqual(1); // month >= 1
    expect(start[1]).toBeLessThanOrEqual(12); // month <= 12
    expect(start[2]).toBeGreaterThanOrEqual(1); // day >= 1
    expect(start[2]).toBeLessThanOrEqual(31); // day <= 31
  });

  it("processes multiple events with correct titles", () => {
    const events = [
      makeEvent({ id: "1", shortName: "PBKS v SRH" }),
      makeEvent({ id: "2", shortName: "CSK v DC" }),
    ];
    const result = transformIplEventsToIcs(events);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("IPL: PBKS v SRH");
    expect(result[1].title).toBe("IPL: CSK v DC");
  });
});
