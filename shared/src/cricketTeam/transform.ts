import type { CricketTeamEvent } from "./types.ts";
import { getCricketMatchMinutes } from "./types.ts";
import dayjs, { type Dayjs } from "dayjs";
import type { EventAttributes } from "ics";

function toDateArray(d: Dayjs): [number, number, number, number, number] {
  return [d.year(), d.month() + 1, d.date(), d.hour(), d.minute()];
}

/**
 * Transforms a team's matches to iCalendar events. Titles read
 * "Zimbabwe v India — 2nd T20I" (the format detail is omitted when ESPN
 * doesn't provide one); the description carries the series name so a calendar
 * entry keeps its context. Every match — Tests included — spans its format's
 * nominal duration (see `shared/src/sports/formats.ts`), so an end is computed
 * the same way here as it is for the live/past check. ESPN's `endDate` is not
 * used; see `isCricketEventPast` for why it cannot be trusted as an end time.
 * `uid` matches the other leagues' `{id}@sports-calendar` pattern so the
 * personal feed can dedupe across sources.
 */
export function transformCricketTeamEventsToIcs(
  events: CricketTeamEvent[]
): EventAttributes[] {
  return events.map(event => {
    const start = dayjs(event.date);
    const durationMinutes = getCricketMatchMinutes(event.format);
    return {
      uid: `${event.id}@sports-calendar`,
      title: event.formatDetail
        ? `${event.name} — ${event.formatDetail}`
        : event.name,
      description: `${event.seriesName}: ${event.name} — ${event.fullStatus.type.description}`,
      start: toDateArray(start),
      location: event.venue?.fullName,
      duration: {
        hours: Math.floor(durationMinutes / 60),
        minutes: durationMinutes % 60,
      },
    };
  });
}
