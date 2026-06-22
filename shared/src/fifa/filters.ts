import type { FifaEvent, FifaEventFilters } from "./types.ts";
import { FIFA_DURATION_MINUTES } from "./types.ts";
import { isEventPast } from "../eventStatus.ts";

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
