import type { F1Event } from "../types/f1.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";
import { translateF1EventTypeAbbr } from "../lib/translateF1EventTypeAbbr.ts";
import { cleanUpSponsorName } from "../lib/cleanUpSponsorName.ts";
import { F1_SESSION_DURATIONS } from "../lib/durations.ts";

export function transformF1EventsToIcs(events: F1Event[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];
  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const sessionName = translateF1EventTypeAbbr(
        competition.type.abbreviation
      );
      const raceName = cleanUpSponsorName(mainEvent.shortName);
      const durationMin = F1_SESSION_DURATIONS[competition.type.id] ?? 60;
      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title: `F1: ${sessionName} (${raceName})`,
        description: `F1: ${mainEvent.name} — ${sessionName}`,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration: {
          hours: Math.floor(durationMin / 60),
          minutes: durationMin % 60,
        },
      });
    }
  }
  return icsEvents;
}
