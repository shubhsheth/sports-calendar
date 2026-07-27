import type { FifaEvent } from "./types.ts";
import { getDurationMinutes } from "../sports/formats.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";

export function transformFifaEventsToIcs(
  events: FifaEvent[]
): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];
  const durationMinutes = getDurationMinutes("soccer");

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `FIFA: ${mainEvent.shortName}`;

      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title,
        description: `FIFA: ${mainEvent.name}`,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: {
          hours: Math.floor(durationMinutes / 60),
          minutes: durationMinutes % 60,
        },
        location: competition.venue?.fullName,
      });
    }
  }

  return icsEvents;
}
