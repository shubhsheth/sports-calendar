import type { NbaEvent, NbaEventFilters } from "@/types/nba";
import dayjs from "dayjs";

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
  filters: NbaEventFilters,
): NbaEvent | null {
  const filteredCompetitions = event.competitions.filter((competition) => {
    if (!filters.showPastEvents && dayjs(competition.date).isBefore(dayjs())) {
      return false;
    }

    // if (
    //   competition.competitors.find((c) => c.team.$ref.includes("teams/10?")) ===
    //   undefined
    // ) {
    //   return false;
    // }

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
  setFilters: React.Dispatch<React.SetStateAction<NbaEventFilters>>,
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}
