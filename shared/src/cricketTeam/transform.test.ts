import { transformCricketTeamEventsToIcs } from "./transform.ts";
import { makeCricketTeamEvent } from "./testEvent.ts";
import dayjs from "dayjs";

describe("transformCricketTeamEventsToIcs", () => {
  it("maps a T20I to a fixed-duration event with title, series description, and uid", () => {
    const [ics] = transformCricketTeamEventsToIcs([makeCricketTeamEvent()]);
    expect(ics).toEqual({
      uid: "1544001@sports-calendar",
      title: "Sri Lanka v India — 1st T20I",
      description:
        "India tour of Sri Lanka 2026: Sri Lanka v India — Scheduled",
      start: [2026, 8, 15, 4, 30],
      duration: { hours: 4, minutes: 0 },
      location: "Galle International Stadium",
    });
  });

  it("gives ODIs the 8-hour duration", () => {
    const [ics] = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({ format: "odi", formatDetail: "2nd ODI" }),
    ]);
    expect(ics).toMatchObject({
      title: "Sri Lanka v India — 2nd ODI",
      duration: { hours: 8, minutes: 0 },
    });
  });

  it("splits a Test into five daily 8-hour events, one per day", () => {
    // endDate is padded to a day boundary and occasionally precedes the start,
    // so the daily spans come from the format like every other match.
    const local = dayjs("2026-08-15T04:30Z");
    const events = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({
        format: "test",
        formatDetail: "1st Test",
        date: "2026-08-15T04:30Z",
        endDate: "2026-08-20T23:59Z",
      }),
    ]);
    expect(events).toHaveLength(5);
    events.forEach((ics, i) => {
      const day = local.add(i, "day");
      expect(ics).toMatchObject({
        uid: `1544001-day${i + 1}@sports-calendar`,
        title: `Sri Lanka v India — 1st Test (Day ${i + 1})`,
        start: [
          day.year(),
          day.month() + 1,
          day.date(),
          day.hour(),
          day.minute(),
        ],
        duration: { hours: 8, minutes: 0 },
        location: "Galle International Stadium",
      });
      expect(ics).not.toHaveProperty("end");
    });
  });

  it("gives each Test day a distinct uid so they survive dedupe", () => {
    const events = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({ format: "test", formatDetail: "1st Test" }),
    ]);
    const uids = events.map(e => e.uid);
    expect(new Set(uids).size).toBe(5);
  });

  it("splits a Test with no endDate identically", () => {
    const events = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({
        format: "test",
        formatDetail: "Only Test",
        endDate: undefined,
      }),
    ]);
    expect(events).toHaveLength(5);
    expect(events[0]).toMatchObject({
      title: "Sri Lanka v India — Only Test (Day 1)",
      duration: { hours: 8, minutes: 0 },
    });
  });

  it("omits the format suffix when ESPN provides no detail", () => {
    const [ics] = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({ formatDetail: "" }),
    ]);
    expect(ics).toMatchObject({ title: "Sri Lanka v India" });
  });
});
