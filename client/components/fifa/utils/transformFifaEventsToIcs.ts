import type { FifaEvent } from "@sports-calendar/shared";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

export function transformFifaEventsToIcs(
  events: FifaEvent[]
): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `FIFA: ${mainEvent.shortName}`;

      icsEvents.push({
        title,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: { hours: 2, minutes: 0 },
        location: competition.venue?.fullName,
      });
    }
  }

  return icsEvents;
}
