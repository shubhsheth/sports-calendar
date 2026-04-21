import type { NbaEvent, NbaEventFilters } from "../types/nba";
import { isEventPast } from "../lib/eventStatus";
import { NBA_DURATION_MINUTES } from "../lib/nbaEventDuration";

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
      isEventPast(competition.date, NBA_DURATION_MINUTES)
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
