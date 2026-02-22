import type { F1Event } from "@/types/f1";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";
import { translateF1EventTypeAbbr } from "./translateF1EventType";
import { cleanUpSponsorName } from "./cleanUpSponsorName";

export function transformF1EventsToIcs(events: F1Event[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `F1: ${translateF1EventTypeAbbr(competition.type.abbreviation)} (${cleanUpSponsorName(mainEvent.shortName)})`;

      icsEvents.push({
        title,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: { hours: 1 },
      });
    }
  }

  return icsEvents;
}
