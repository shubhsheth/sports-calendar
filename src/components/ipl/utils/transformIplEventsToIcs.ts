import type { IplEvent } from "@/types/ipl";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

export function transformIplEventsToIcs(
  events: IplEvent[]
): EventAttributes[] {
  return events.map(event => {
    const start = dayjs(event.date);
    return {
      title: `IPL: ${event.shortName}`,
      start: [
        start.year(),
        start.month() + 1,
        start.date(),
        start.hour(),
        start.minute(),
      ],
      duration: { hours: 4, minutes: 0 },
    };
  });
}
