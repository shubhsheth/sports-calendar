import type { CricketTeamEvent } from "./types.ts";
import { CRICKET_FORMAT_DURATION_MINUTES } from "./types.ts";
import dayjs, { type Dayjs } from "dayjs";
import type { EventAttributes } from "ics";

function toDateArray(d: Dayjs): [number, number, number, number, number] {
  return [d.year(), d.month() + 1, d.date(), d.hour(), d.minute()];
}

/**
 * Transforms a team's matches to iCalendar events. Titles read
 * "Zimbabwe v India — 2nd T20I" (the format detail is omitted when ESPN
 * doesn't provide one); the description carries the series name so a calendar
 * entry keeps its context. A Test with an `endDate` becomes one multi-day
 * event spanning `date → endDate`; every other match gets its format's
 * nominal duration (`CRICKET_FORMAT_DURATION_MINUTES`). `uid` matches the
 * other leagues' `{id}@sports-calendar` pattern so the personal feed can
 * dedupe across sources.
 */
export function transformCricketTeamEventsToIcs(
  events: CricketTeamEvent[]
): EventAttributes[] {
  return events.map(event => {
    const start = dayjs(event.date);
    const base = {
      uid: `${event.id}@sports-calendar`,
      title: event.formatDetail
        ? `${event.name} — ${event.formatDetail}`
        : event.name,
      description: `${event.seriesName}: ${event.name} — ${event.fullStatus.type.description}`,
      start: toDateArray(start),
      location: event.venue?.fullName,
    };

    if (event.format === "test" && event.endDate) {
      return { ...base, end: toDateArray(dayjs(event.endDate)) };
    }

    const durationMinutes = CRICKET_FORMAT_DURATION_MINUTES[event.format];
    return {
      ...base,
      duration: {
        hours: Math.floor(durationMinutes / 60),
        minutes: durationMinutes % 60,
      },
    };
  });
}
