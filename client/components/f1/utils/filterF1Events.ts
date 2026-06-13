import type { F1Event, F1EventFilters } from "@sports-calendar/shared";
import { isEventPast } from "@/lib/eventStatus";
import { F1_SESSION_DURATIONS } from "./f1SessionDurations";

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

  return {
    ...event,
    competitions: filteredCompetitions,
  };
}

export function toggleShowPastEvents(
  filters: F1EventFilters,
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleEventType(
  type: string,
  filters: F1EventFilters,
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>
) {
  const types = filters.types.includes(type)
    ? filters.types.filter(t => t !== type)
    : [...filters.types, type];
  setFilters({ ...filters, types });
}
