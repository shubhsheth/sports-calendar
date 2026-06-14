import type { FifaEvent, FifaEventFilters } from "@sports-calendar/shared";
import { isEventPast } from "@/lib/eventStatus";
import { FIFA_DURATION_MINUTES } from "./fifaEventDuration";

function getTeamIdFromRef(ref: string): string | undefined {
  return ref.match(/\/teams\/(\d+)/)?.[1];
}

export function filterFifaEvents(
  events: FifaEvent[],
  filters: FifaEventFilters
) {
  const filteredEvents: FifaEvent[] = [];
  for (const event of events) {
    const filteredEvent = filterFifaEvent(event, filters);
    if (filteredEvent) filteredEvents.push(filteredEvent);
  }
  return filteredEvents;
}

export function filterFifaEvent(
  event: FifaEvent,
  filters: FifaEventFilters
): FifaEvent | null {
  const filteredCompetitions = event.competitions.filter(competition => {
    if (
      !filters.showPastEvents &&
      isEventPast(competition.date, FIFA_DURATION_MINUTES)
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
  filters: FifaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<FifaEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: FifaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<FifaEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
