import type { NbaEvent, NbaEventFilters } from "@/types/nba";
import dayjs from "dayjs";

function getTeamIdFromRef(ref: string): string | undefined {
  return ref.match(/\/teams\/(\d+)/)?.[1];
}

export function filterNbaEvents(events: NbaEvent[], filters: NbaEventFilters) {
  const filteredEvents: NbaEvent[] = [];
  for (const event of events) {
    const filteredEvent = filterNbaEvent(event, filters);
    if (filteredEvent) filteredEvents.push(filteredEvent);
  }
  return filteredEvents;
}

export function filterNbaEvent(
  event: NbaEvent,
  filters: NbaEventFilters
): NbaEvent | null {
  const filteredCompetitions = event.competitions.filter(competition => {
    if (
      !filters.showPastEvents &&
      dayjs().isAfter(dayjs(competition.date).add(150, "minutes"))
    ) {
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
  filters: NbaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NbaEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: NbaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NbaEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
