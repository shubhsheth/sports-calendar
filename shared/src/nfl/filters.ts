import type { NflEvent, NflEventFilters } from "./types.ts";
import { getDurationMinutes } from "../sports/formats.ts";
import { isEventPast } from "../eventStatus.ts";

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
    if (
      !filters.showPastEvents &&
      isEventPast(competition.date, getDurationMinutes("football"))
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
