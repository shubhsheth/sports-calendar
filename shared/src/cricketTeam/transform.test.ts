import { transformCricketTeamEventsToIcs } from "./transform.ts";
import { makeCricketTeamEvent } from "./testEvent.ts";

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

  it("spans a Test from date to endDate instead of a duration", () => {
    const [ics] = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({
        format: "test",
        formatDetail: "1st Test",
        date: "2026-08-15T04:30Z",
        endDate: "2026-08-20T23:59Z",
      }),
    ]);
    expect(ics).toMatchObject({
      title: "Sri Lanka v India — 1st Test",
      start: [2026, 8, 15, 4, 30],
      end: [2026, 8, 20, 23, 59],
    });
    expect(ics).not.toHaveProperty("duration");
  });

  it("falls back to the nominal duration for a Test without endDate", () => {
    const [ics] = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({
        format: "test",
        formatDetail: "Only Test",
        endDate: undefined,
      }),
    ]);
    expect(ics).toMatchObject({
      title: "Sri Lanka v India — Only Test",
      duration: { hours: 120, minutes: 0 },
    });
  });

  it("omits the format suffix when ESPN provides no detail", () => {
    const [ics] = transformCricketTeamEventsToIcs([
      makeCricketTeamEvent({ formatDetail: "" }),
    ]);
    expect(ics).toMatchObject({ title: "Sri Lanka v India" });
  });
});
