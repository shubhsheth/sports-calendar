import type { F1Event } from "./types.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";
import {
  F1_SESSION_DURATIONS,
  translateF1EventTypeAbbr,
  translateF1EventTypeId,
} from "./types.ts";

const SPONSORS = [
  "Qatar Airways",
  "Heineken",
  "Aramco",
  "Gulf Air",
  "STC",
  "Crypto.com",
  "Lenovo",
  "MSC Cruises",
  "Pirelli",
  "AWS",
  "Tag Heuer",
  "Singapore Airlines",
  "Etihad Airways",
  "Moët & Chandon",
];

function cleanUpF1SponsorNames(name: string): string {
  let cleanedName = name;

  for (const sponsor of SPONSORS) {
    cleanedName = cleanedName.replace(
      new RegExp(`\\b${sponsor}\\b[\\s-]*`, "gi"),
      ""
    );
  }

  cleanedName = cleanedName
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .replace(/\s{2,}/g, " ");

  return cleanedName;
}

export function transformF1EventsToIcs(events: F1Event[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `F1: ${translateF1EventTypeAbbr(competition.type.abbreviation)} (${cleanUpF1SponsorNames(mainEvent.shortName)})`;
      const durationMin = F1_SESSION_DURATIONS[competition.type.id] ?? 60;

      icsEvents.push({
        uid: `${competition.id}@sports-calendar`,
        title,
        description: `F1: ${cleanUpF1SponsorNames(mainEvent.name)} — ${translateF1EventTypeId(competition.type.id)}`,
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
