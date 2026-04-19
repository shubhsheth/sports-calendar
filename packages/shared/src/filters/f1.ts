import type { F1Event, F1EventFilters } from "../types/f1.ts";
import { isEventPast } from "../lib/eventStatus.ts";
import { F1_SESSION_DURATIONS } from "../lib/durations.ts";

export function filterF1Events(events: F1Event[], filters: F1EventFilters) {
  const filteredEvents: F1Event[] = [];
  for (const event of events) {
    const filteredEvent = filterF1Event(event, filters);
    if (filteredEvent) filteredEvents.push(filteredEvent);
  }
  return filteredEvents;
}

export function filterF1Event(
  event: F1Event,
  filters: F1EventFilters
): F1Event | null {
  const filteredCompetitions = event.competitions.filter(competition => {
    const durationMin = F1_SESSION_DURATIONS[competition.type.id] ?? 60;
    if (!filters.showPastEvents && isEventPast(competition.date, durationMin)) {
      return false;
    }
    if (!filters.types.includes(competition.type.id)) {
      return false;
    }
    return true;
  });
  if (!filteredCompetitions.length) return null;
  return { ...event, competitions: filteredCompetitions };
}
