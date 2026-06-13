import { describe, it, expect } from "vitest";
import { filterIplEvent, filterIplEvents } from "./filters";
import type { IplEvent } from "./types";

const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

function makeEvent(override: Partial<IplEvent> = {}): IplEvent {
  return {
    id: "501",
    uid: "s:0~l:8048~e:501",
    date: FUTURE_DATE,
    timeValid: true,
    name: "Punjab Kings v Mumbai Indians",
    shortName: "PBKS v MI",
    fullStatus: {
      type: {
        id: "1",
        state: "pre",
        description: "Scheduled",
        detail: "Scheduled",
        shortDetail: "Scheduled",
      },
      summary: "Scheduled",
      longSummary: "Scheduled",
    },
    competitors: [
      {
        id: "pbks",
        uid: "s:pbks",
        order: 1,
        homeAway: "home",
        winner: false,
        displayName: "Punjab Kings",
        abbreviation: "PBKS",
        score: "",
        logo: "",
      },
      {
        id: "mi",
        uid: "s:mi",
        order: 2,
        homeAway: "away",
        winner: false,
        displayName: "Mumbai Indians",
        abbreviation: "MI",
        score: "",
        logo: "",
      },
    ],
    ...override,
  };
}

describe("filterIplEvent", () => {
  it("keeps future event when showPastEvents is false", () => {
    const result = filterIplEvent(makeEvent({ date: FUTURE_DATE }), {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).not.toBeNull();
  });

  it("removes past event when showPastEvents is false", () => {
    const result = filterIplEvent(makeEvent({ date: PAST_DATE }), {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toBeNull();
  });

  it("keeps past event when showPastEvents is true", () => {
    const result = filterIplEvent(makeEvent({ date: PAST_DATE }), {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).not.toBeNull();
  });

  it("keeps event when home team id matches teamIds filter", () => {
    const result = filterIplEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: ["pbks"],
    });
    expect(result).not.toBeNull();
  });

  it("keeps event when away team id matches teamIds filter", () => {
    const result = filterIplEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: ["mi"],
    });
    expect(result).not.toBeNull();
  });

  it("removes event when no competitor id matches teamIds filter", () => {
    const result = filterIplEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: ["csk"],
    });
    expect(result).toBeNull();
  });

  it("returns all events when teamIds is empty", () => {
    const result = filterIplEvent(makeEvent(), {
      showPastEvents: true,
      teamIds: [],
    });
    expect(result).not.toBeNull();
  });
});

describe("filterIplEvents", () => {
  it("removes past events and keeps future events", () => {
    const past = makeEvent({ id: "501", date: PAST_DATE });
    const future = makeEvent({ id: "502", date: FUTURE_DATE });
    const result = filterIplEvents([past, future], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("502");
  });

  it("returns all events when nothing is filtered", () => {
    const events = [makeEvent({ id: "501" }), makeEvent({ id: "502" })];
    expect(
      filterIplEvents(events, { showPastEvents: true, teamIds: [] })
    ).toHaveLength(2);
  });

  it("returns empty array when input is empty", () => {
    expect(filterIplEvents([], { showPastEvents: true, teamIds: [] })).toEqual(
      []
    );
  });
});
