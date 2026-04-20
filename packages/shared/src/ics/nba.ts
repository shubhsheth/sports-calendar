import type { NbaEvent } from "../types/nba";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";
import { NBA_DURATION_MINUTES } from "../lib/nbaEventDuration";

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
