import type { CricketTeamEvent } from "./types.ts";
import { getCricketMatchMinutes } from "./types.ts";
import dayjs, { type Dayjs } from "dayjs";
import type { EventAttributes } from "ics";

function toDateArray(d: Dayjs): [number, number, number, number, number] {
  return [d.year(), d.month() + 1, d.date(), d.hour(), d.minute()];
}

/** A Test is scheduled across five days, one playing session each. */
const TEST_MATCH_DAYS = 5;
/** Nominal length of a single day's play, breaks included. */
const TEST_MATCH_DAY_HOURS = 8;

/**
 * Transforms a team's matches to iCalendar events. Titles read
 * "Zimbabwe v India — 2nd T20I" (the format detail is omitted when ESPN
 * doesn't provide one); the description carries the series name so a calendar
 * entry keeps its context. `uid` matches the other leagues'
 * `{id}@sports-calendar` pattern so the personal feed can dedupe across sources.
 *
 * A Test is played over five days but only a session a day, so it becomes five
 * separate {@link TEST_MATCH_DAY_HOURS}-hour events ("… (Day 1)" …) rather than
 * one block that would wall off the calendar overnight. Each day carries its own
 * `-day{n}` uid so the five survive dedupe. Limited-overs matches stay a single
 * event spanning their format's nominal duration (see
 * `shared/src/sports/formats.ts`). ESPN's `endDate` is used for neither; see
 * `isCricketEventPast` for why it cannot be trusted as an end time.
 */
export function transformCricketTeamEventsToIcs(
  events: CricketTeamEvent[]
): EventAttributes[] {
  return events.flatMap(toIcsEvents);
}

function toIcsEvents(event: CricketTeamEvent): EventAttributes[] {
  const title = event.formatDetail
    ? `${event.name} — ${event.formatDetail}`
    : event.name;
  const shared = {
    description: `${event.seriesName}: ${event.name} — ${event.fullStatus.type.description}`,
    location: event.venue?.fullName,
  };
  const start = dayjs(event.date);

  if (event.format === "test") {
    return Array.from({ length: TEST_MATCH_DAYS }, (_, i) => ({
      uid: `${event.id}-day${i + 1}@sports-calendar`,
      title: `${title} (Day ${i + 1})`,
      start: toDateArray(start.add(i, "day")),
      duration: { hours: TEST_MATCH_DAY_HOURS, minutes: 0 },
      ...shared,
    }));
  }

  const durationMinutes = getCricketMatchMinutes(event.format);
  return [
    {
      uid: `${event.id}@sports-calendar`,
      title,
      start: toDateArray(start),
      duration: {
        hours: Math.floor(durationMinutes / 60),
        minutes: durationMinutes % 60,
      },
      ...shared,
    },
  ];
}
