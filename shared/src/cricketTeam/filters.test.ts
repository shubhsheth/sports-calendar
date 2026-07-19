import { filterCricketTeamEvents, isCricketEventPast } from "./filters.ts";
import { makeCricketTeamEvent } from "./testEvent.ts";

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const showAll = { showPastEvents: true, formats: [] };

describe("filterCricketTeamEvents", () => {
  const test_ = makeCricketTeamEvent({ id: "1", format: "test" });
  const odi = makeCricketTeamEvent({ id: "2", format: "odi" });
  const t20i = makeCricketTeamEvent({ id: "3", format: "t20i" });
  const other = makeCricketTeamEvent({ id: "4", format: "other" });
  const all = [test_, odi, t20i, other];

  it("shows all formats when none are selected", () => {
    expect(filterCricketTeamEvents(all, showAll)).toEqual(all);
  });

  it("keeps only the selected format", () => {
    expect(
      filterCricketTeamEvents(all, { showPastEvents: true, formats: ["test"] })
    ).toEqual([test_]);
  });

  it("keeps any of several selected formats", () => {
    expect(
      filterCricketTeamEvents(all, {
        showPastEvents: true,
        formats: ["odi", "t20i"],
      })
    ).toEqual([odi, t20i]);
  });

  it("drops past events unless showPastEvents", () => {
    const past = makeCricketTeamEvent({ id: "p", date: daysFromNow(-2) });
    const upcoming = makeCricketTeamEvent({ id: "u", date: daysFromNow(2) });
    expect(
      filterCricketTeamEvents([past, upcoming], {
        showPastEvents: false,
        formats: [],
      })
    ).toEqual([upcoming]);
    expect(filterCricketTeamEvents([past, upcoming], showAll)).toEqual([
      past,
      upcoming,
    ]);
  });
});

describe("isCricketEventPast", () => {
  it("uses endDate when present: an in-progress Test is not past", () => {
    const ongoingTest = makeCricketTeamEvent({
      format: "test",
      date: daysFromNow(-2),
      endDate: daysFromNow(2),
    });
    expect(isCricketEventPast(ongoingTest)).toBe(false);

    const finishedTest = makeCricketTeamEvent({
      format: "test",
      date: daysFromNow(-6),
      endDate: daysFromNow(-1),
    });
    expect(isCricketEventPast(finishedTest)).toBe(true);
  });

  it("falls back to the format duration without endDate", () => {
    // A T20I (240 min) that started 5 hours ago is over…
    const doneT20i = makeCricketTeamEvent({
      format: "t20i",
      date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });
    expect(isCricketEventPast(doneT20i)).toBe(true);
    // …but an ODI (480 min) started 5 hours ago is still going.
    const runningOdi = makeCricketTeamEvent({
      format: "odi",
      date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });
    expect(isCricketEventPast(runningOdi)).toBe(false);
  });
});
