import type { NflEvent } from "../types/nfl.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

export function transformNflEventsToIcs(events: NflEvent[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];
  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title: `NFL: ${mainEvent.shortName}`,
        description: `NFL: ${mainEvent.name}`,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: { hours: 2, minutes: 30 },
        location: competition.venue?.fullName,
      });
    }
  }
  return icsEvents;
}
