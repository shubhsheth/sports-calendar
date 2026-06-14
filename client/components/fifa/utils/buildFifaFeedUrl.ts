import type { FifaEventFilters } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

/**
 * Builds the live, auto-updating FIFA `.ics` subscription feed URL for the given
 * filters. `showPastEvents` is intentionally omitted — the live feed always
 * includes past events.
 *
 * @param filters - The current FIFA event filters (only `teamIds` is used).
 * @returns The subscription feed URL.
 */
export function buildFifaFeedUrl(filters: FifaEventFilters): string {
  const params = new URLSearchParams();
  if (filters.teamIds.length > 0) {
    params.set("teamIds", filters.teamIds.join(","));
  }
  return buildCalendarFeedUrl("fifa", params);
}
