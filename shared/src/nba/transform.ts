import type { NbaEvent } from "./types.ts";
import { getDurationMinutes } from "../sports/formats.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

/**
 * Builds one ICS event per NBA game. Title: `NBA: {shortName}`; duration is
 * basketball's nominal length (see `shared/src/sports/formats.ts`).
 *
 * @param events - The NBA events to convert.
 * @returns One ICS event attribute object per game.
 */
export function transformNbaEventsToIcs(events: NbaEvent[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];
  const durationMinutes = getDurationMinutes("basketball");

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `NBA: ${mainEvent.shortName}`;

      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title,
        description: `NBA: ${mainEvent.name}`,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: {
          hours: Math.floor(durationMinutes / 60),
          minutes: durationMinutes % 60,
        },
        location: competition.venue?.fullName,
      });
    }
  }

  return icsEvents;
}
