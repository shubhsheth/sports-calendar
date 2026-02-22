import type { NbaEvent } from "@/types/nba";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

export function transformNbaEventsToIcs(events: NbaEvent[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `NBA: ${mainEvent.shortName}`;

      icsEvents.push({
        title,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: { hours: 2, minutes: 30 },
      });
    }
  }

  return icsEvents;
}
