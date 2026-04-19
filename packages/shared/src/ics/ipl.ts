import type { IplEvent } from "../types/ipl.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

export function transformIplEventsToIcs(events: IplEvent[]): EventAttributes[] {
  return events.map(event => {
    const start = dayjs(event.date);
    return {
      uid: `${event.id}@sports-calendar`,
      title: `IPL: ${event.shortName}`,
      description: `IPL: ${event.name} — ${event.fullStatus.type.description}`,
      start: [
        start.year(),
        start.month() + 1,
        start.date(),
        start.hour(),
        start.minute(),
      ],
      duration: { hours: 4, minutes: 0 },
      location: event.venue?.fullName,
    };
  });
}
