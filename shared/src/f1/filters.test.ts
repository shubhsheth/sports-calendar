import { describe, it, expect } from "vitest";
import { filterF1Event, filterF1Events } from "./filters.ts";
import type { F1Event, F1EventCompetition } from "./types.ts";

const FUTURE_DATE = "2099-12-01T20:00:00Z";
const PAST_DATE = "2000-01-01T20:00:00Z";

function makeCompetition(
  override: Partial<F1EventCompetition> = {}
): F1EventCompetition {
  return {
    $ref: "https://ref",
    id: "comp1",
    date: FUTURE_DATE,
    type: { id: "3", text: "Race", abbreviation: "Race" },
    timeValid: true,
    recent: false,
    bracketAvailable: false,
    gameSource: { id: "1", description: "ESPN", state: "full" },
    status: { $ref: "https://status" },
    session: 5,
    ...override,
  };
}

function makeEvent(
  competitions: F1EventCompetition[] = [makeCompetition()]
): F1Event {
  return {
    $ref: "https://ref",
    id: "evt1",
    date: FUTURE_DATE,
    name: "Formula 1 Grand Prix",
    shortName: "Grand Prix",
    season: { $ref: "https://season" },
    competitions,
  };
}

const ALL_TYPES = ["1", "2", "3", "5", "6"];

describe("filterF1Event", () => {
  it("returns event unchanged when all types included and showPastEvents is true", () => {
    const result = filterF1Event(makeEvent(), {
      showPastEvents: true,
      types: ALL_TYPES,
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it("keeps competition whose type.id is in the types filter", () => {
    const result = filterF1Event(
      makeEvent([
        makeCompetition({
          type: { id: "3", text: "Race", abbreviation: "Race" },
        }),
      ]),
      { showPastEvents: true, types: ["3"] }
    );
    expect(result).not.toBeNull();
  });

  it("removes competition whose type.id is not in the types filter", () => {
    const result = filterF1Event(
      makeEvent([
        makeCompetition({
          type: { id: "1", text: "Practice", abbreviation: "P" },
        }),
      ]),
      { showPastEvents: true, types: ["2", "3"] }
    );
    expect(result).toBeNull();
  });

  it("removes past competition when showPastEvents is false", () => {
    const result = filterF1Event(
      makeEvent([makeCompetition({ date: PAST_DATE })]),
      { showPastEvents: false, types: ALL_TYPES }
    );
    expect(result).toBeNull();
  });

  it("keeps past competition when showPastEvents is true", () => {
    const result = filterF1Event(
      makeEvent([makeCompetition({ date: PAST_DATE })]),
      { showPastEvents: true, types: ALL_TYPES }
    );
    expect(result).not.toBeNull();
  });

  it("applies both time and type filters: future+type3 survives, past+type3 fails time, future+type1 fails type", () => {
    const event = makeEvent([
      makeCompetition({
        id: "a",
        date: FUTURE_DATE,
        type: { id: "3", text: "Race", abbreviation: "Race" },
      }),
      makeCompetition({
        id: "b",
        date: PAST_DATE,
        type: { id: "3", text: "Race", abbreviation: "Race" },
      }),
      makeCompetition({
        id: "c",
        date: FUTURE_DATE,
        type: { id: "1", text: "Practice", abbreviation: "P" },
      }),
    ]);
    const result = filterF1Event(event, {
      showPastEvents: false,
      types: ["3"],
    });
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
    expect(result!.competitions[0].id).toBe("a");
  });

  it("returns null when all competitions are filtered out", () => {
    const event = makeEvent([
      makeCompetition({
        type: { id: "1", text: "Practice", abbreviation: "P" },
      }),
    ]);
    const result = filterF1Event(event, { showPastEvents: true, types: ["3"] });
    expect(result).toBeNull();
  });
});

describe("filterF1Events", () => {
  it("drops events with no remaining competitions", () => {
    const practice = makeEvent([
      makeCompetition({
        type: { id: "1", text: "Practice", abbreviation: "P" },
      }),
    ]);
    const race = { ...makeEvent(), id: "evt2" };
    const result = filterF1Events([practice, race], {
      showPastEvents: true,
      types: ["3"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("evt2");
  });

  it("returns all events when nothing is filtered", () => {
    const events = [makeEvent(), { ...makeEvent(), id: "evt2" }];
    expect(
      filterF1Events(events, { showPastEvents: true, types: ALL_TYPES })
    ).toHaveLength(2);
  });

  it("returns empty array when input is empty", () => {
    expect(
      filterF1Events([], { showPastEvents: true, types: ALL_TYPES })
    ).toEqual([]);
  });
});
