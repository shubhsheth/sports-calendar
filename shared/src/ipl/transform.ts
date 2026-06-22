import type { IplEvent } from "./types.ts";
import { IPL_DURATION_MINUTES } from "./types.ts";
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
      duration: {
        hours: Math.floor(IPL_DURATION_MINUTES / 60),
        minutes: IPL_DURATION_MINUTES % 60,
      },
      location: event.venue?.fullName,
    };
  });
}
