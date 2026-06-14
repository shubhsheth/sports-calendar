import type { NbaEventFilters } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

/**
 * Builds the live, auto-updating NBA `.ics` subscription feed URL for the given
 * filters. `showPastEvents` is intentionally omitted — the live feed always
 * includes past events.
 *
 * @param filters - The current NBA event filters (only `teamIds` is used).
 * @returns The subscription feed URL.
 */
export function buildNbaFeedUrl(filters: NbaEventFilters): string {
  const params = new URLSearchParams();
  if (filters.teamIds.length > 0) {
    params.set("teamIds", filters.teamIds.join(","));
  }
  return buildCalendarFeedUrl("nba", params);
}
