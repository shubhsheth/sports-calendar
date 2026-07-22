import type { CricketTeamEvent, CricketTeamFilters } from "./types.ts";
import { CRICKET_FORMAT_DURATION_MINUTES } from "./types.ts";
import dayjs from "dayjs";
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
 * A cricket match is past once its `endDate` has passed (multi-day Tests stay
 * current across all their days); without one, fall back to the format's
 * nominal duration like other leagues do.
 */
export function isCricketEventPast(event: CricketTeamEvent): boolean {
  if (event.endDate) {
    return dayjs().isAfter(dayjs(event.endDate));
  }
  return isEventPast(event.date, CRICKET_FORMAT_DURATION_MINUTES[event.format]);
}
