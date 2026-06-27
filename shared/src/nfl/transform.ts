import type { NflEvent } from "./types.ts";
import { NFL_DURATION_MINUTES } from "./types.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

/**
 * Builds one ICS event per NFL game. Title: `NFL: {shortName}`; duration is
 * `NFL_DURATION_MINUTES` (see `shared/src/nfl/types.ts`).
 *
 * @param events - The NFL events to convert.
 * @returns One ICS event attribute object per game.
 */
export function transformNflEventsToIcs(events: NflEvent[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `NFL: ${mainEvent.shortName}`;

      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title,
        description: `NFL: ${mainEvent.name} — ${competition.gameSource.state}`,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: {
          hours: Math.floor(NFL_DURATION_MINUTES / 60),
          minutes: NFL_DURATION_MINUTES % 60,
        },
        location: competition.venue?.fullName,
      });
    }
  }

  return icsEvents;
}
