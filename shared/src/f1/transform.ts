import type { F1Event } from "./types.ts";
import dayjs from "dayjs";
import type { EventAttributes } from "ics";
import { translateF1EventTypeAbbr, translateF1EventTypeId } from "./types.ts";
import { getRacingSessionMinutes } from "../sports/formats.ts";

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

/**
 * Strips title-sponsor prefixes from an F1 event name for display and ICS titles
 * (e.g. "Qatar Airways Bahrain Grand Prix" → "Bahrain Grand Prix"). Known
 * sponsors are listed in `SPONSORS` above; extend it as title sponsors change.
 *
 * @param name - The raw F1 event name, possibly with a title-sponsor prefix.
 * @returns The name with known sponsor prefixes stripped.
 */
export function cleanUpF1SponsorNames(name: string): string {
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

/**
 * Builds one ICS event per F1 session. Title: `F1: {session} ({event name})`
 * with the sponsor prefix stripped; per-session duration comes from
 * `getRacingSessionMinutes` (see `shared/src/sports/formats.ts`).
 *
 * @param events - The F1 events (race weekends) to convert.
 * @returns One ICS event attribute object per session.
 */
export function transformF1EventsToIcs(events: F1Event[]): EventAttributes[] {
  const icsEvents: EventAttributes[] = [];

  for (const mainEvent of events) {
    for (const competition of mainEvent.competitions) {
      const start = dayjs(competition.date);
      const title = `F1: ${translateF1EventTypeAbbr(competition.type.abbreviation)} (${cleanUpF1SponsorNames(mainEvent.shortName)})`;
      const durationMin = getRacingSessionMinutes(competition.type.id);

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
