import type { F1Event, F1EventFilters } from "@/types/f1";
import dayjs from "dayjs";

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
  filters: F1EventFilters,
): F1Event | null {
  const filteredCompetitions = event.competitions.filter((competition) => {
    if (!filters.showPastEvents && dayjs(competition.date).isBefore(dayjs())) {
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
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>,
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleEventType(
  type: string,
  filters: F1EventFilters,
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>,
) {
  const types = filters.types.includes(type)
    ? filters.types.filter((t) => t !== type)
    : [...filters.types, type];
  setFilters({ ...filters, types });
}
