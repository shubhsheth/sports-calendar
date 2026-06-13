import type { NflEvent } from "../types/nfl";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";
import { NFL_DURATION_MINUTES } from "../lib/nflEventDuration";

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
