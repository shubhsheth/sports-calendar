import type { FifaEvent } from "./types.ts";
import { FIFA_DURATION_MINUTES } from "./types.ts";
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
        uid: `${competition.id}@sports-calendar`,
        title,
        description: `FIFA: ${mainEvent.name} — ${competition.gameSource.state}`,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: {
          hours: Math.floor(FIFA_DURATION_MINUTES / 60),
          minutes: FIFA_DURATION_MINUTES % 60,
        },
        location: competition.venue?.fullName,
      });
    }
  }

  return icsEvents;
}
