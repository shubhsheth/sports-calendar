import type { NflEvent, NflEventFilters } from "@/types/nfl";
import dayjs from "dayjs";

function getTeamIdFromRef(ref: string): string | undefined {
  return ref.match(/\/teams\/(\d+)/)?.[1];
}

export function filterNflEvents(events: NflEvent[], filters: NflEventFilters) {
  const filteredEvents: NflEvent[] = [];
  for (const event of events) {
    const filteredEvent = filterNflEvent(event, filters);
    if (filteredEvent) filteredEvents.push(filteredEvent);
  }
  return filteredEvents;
}

export function filterNflEvent(
  event: NflEvent,
  filters: NflEventFilters
): NflEvent | null {
  const filteredCompetitions = event.competitions.filter(competition => {
    if (!filters.showPastEvents && dayjs(competition.date).isBefore(dayjs())) {
      return false;
    }

    if (filters.teamIds.length > 0) {
      const hasSelectedTeam = competition.competitors.some(c => {
        const id = getTeamIdFromRef(c.team.$ref);
        return id !== undefined && filters.teamIds.includes(id);
      });
      if (!hasSelectedTeam) return false;
    }

    return true;
  });

  if (!filteredCompetitions.length) return null;

  return {
    ...event,
    competitions: filteredCompetitions,
  };
}

export function toggleShowPastEvents(
  filters: NflEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NflEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: NflEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NflEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
