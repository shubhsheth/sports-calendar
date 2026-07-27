import type { CricketTeamEvent, CricketTeamFilters } from "./types.ts";
import { getCricketMatchMinutes } from "./types.ts";
import { isEventPast } from "../eventStatus.ts";

export function filterCricketTeamEvents(
  events: CricketTeamEvent[],
  filters: CricketTeamFilters
): CricketTeamEvent[] {
  const filtered: CricketTeamEvent[] = [];
  for (const event of events) {
    const result = filterCricketTeamEvent(event, filters);
    if (result) filtered.push(result);
  }
  return filtered;
}

export function filterCricketTeamEvent(
  event: CricketTeamEvent,
  filters: CricketTeamFilters
): CricketTeamEvent | null {
  if (!filters.showPastEvents && isCricketEventPast(event)) {
    return null;
  }

  if (filters.formats.length > 0 && !filters.formats.includes(event.format)) {
    return null;
  }

  return event;
}

/**
 * A cricket match is past once its format's nominal duration has elapsed — the
 * same rule every other sport uses.
 *
 * ESPN's `endDate` is deliberately not consulted. It is present on every match,
 * not just Tests, and is padded to a `23:59` day boundary one or two days out:
 * measured across 137 matches, a T20I's `endDate` sits a median 39.7h after the
 * start for a game lasting about 3.5h. Preferring it left finished matches
 * badged live for over a day. It is also not always sane — one Test carries an
 * `endDate` 23 days *before* its start, which under the old rule made the match
 * disappear three weeks before it was played.
 */
export function isCricketEventPast(event: CricketTeamEvent): boolean {
  return isEventPast(event.date, getCricketMatchMinutes(event.format));
}
