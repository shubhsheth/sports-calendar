import type { IplEvent, IplEventFilters } from "@/types/ipl";
import { isEventPast } from "@/lib/eventStatus";
import { IPL_DURATION_MINUTES } from "./iplEventDuration";

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
    isEventPast(event.date, IPL_DURATION_MINUTES)
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

export function toggleShowPastEvents(
  filters: IplEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<IplEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: IplEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<IplEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
