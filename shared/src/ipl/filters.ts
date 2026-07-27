import type { IplEvent, IplEventFilters } from "./types.ts";
import { getDurationMinutes } from "../sports/formats.ts";
import { isEventPast } from "../eventStatus.ts";

export function filterIplEvents(
  events: IplEvent[],
  filters: IplEventFilters
): IplEvent[] {
  const filtered: IplEvent[] = [];
  for (const event of events) {
    const result = filterIplEvent(event, filters);
    if (result) filtered.push(result);
  }
  return filtered;
}

export function filterIplEvent(
  event: IplEvent,
  filters: IplEventFilters
): IplEvent | null {
  if (
    !filters.showPastEvents &&
    isEventPast(event.date, getDurationMinutes("cricket", "t20"))
  ) {
    return null;
  }

  if (filters.teamIds.length > 0) {
    const hasSelectedTeam = event.competitors.some(c =>
      filters.teamIds.includes(c.id)
    );
    if (!hasSelectedTeam) return null;
  }

  return event;
}
