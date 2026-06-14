import type { IplEventFilters } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

/**
 * Builds the live, auto-updating IPL `.ics` subscription feed URL for the given
 * filters. `showPastEvents` is intentionally omitted — the live feed always
 * includes past events.
 */
export function buildIplFeedUrl(filters: IplEventFilters): string {
  const params = new URLSearchParams();
  if (filters.teamIds.length > 0) {
    params.set("teamIds", filters.teamIds.join(","));
  }
  return buildCalendarFeedUrl("ipl", params);
}
