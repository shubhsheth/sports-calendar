import type { NflEvent } from "./types.ts";
import { getDurationMinutes } from "../sports/formats.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

/**
 * Builds one ICS event per NFL game. Title: `NFL: {shortName}`; duration is
 * the sport's nominal length (see `shared/src/sports/formats.ts`).
 *
 * @param events - The NFL events to convert.
 * @returns One ICS event attribute object per game.
 */
export function transformNflEventsToIcs(events: NflEvent[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];
  const durationMinutes = getDurationMinutes("football", "standard");

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `NFL: ${mainEvent.shortName}`;

      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title,
        description: `NFL: ${mainEvent.name}`,
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
