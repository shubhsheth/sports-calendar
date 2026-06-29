import type { NbaEvent } from "./types.ts";
import { NBA_DURATION_MINUTES } from "./types.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

/**
 * Builds one ICS event per NBA game. Title: `NBA: {shortName}`; duration is
 * `NBA_DURATION_MINUTES` (see `shared/src/nba/types.ts`).
 *
 * @param events - The NBA events to convert.
 * @returns One ICS event attribute object per game.
 */
export function transformNbaEventsToIcs(events: NbaEvent[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `NBA: ${mainEvent.shortName}`;

      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title,
        description: `NBA: ${mainEvent.name} — ${competition.gameSource.state}`,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: {
          hours: Math.floor(NBA_DURATION_MINUTES / 60),
          minutes: NBA_DURATION_MINUTES % 60,
        },
        location: competition.venue?.fullName,
      });
    }
  }

  return icsEvents;
}
