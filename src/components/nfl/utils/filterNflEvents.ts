import type { NflEvent, NflEventFilters } from "@/types/nfl";
import dayjs from "dayjs";

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
  filters: NflEventFilters,
): NflEvent | null {
  const filteredCompetitions = event.competitions.filter((competition) => {
    if (!filters.showPastEvents && dayjs(competition.date).isBefore(dayjs())) {
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
  filters: NflEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NflEventFilters>>,
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}
