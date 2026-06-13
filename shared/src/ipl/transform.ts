import type { IplEvent } from "./types";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

/** Duration of a T20 IPL match in minutes */
const IPL_DURATION_MINUTES = 240;

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
