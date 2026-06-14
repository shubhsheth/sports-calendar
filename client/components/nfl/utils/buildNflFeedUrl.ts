import type { NflEventFilters } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

export function buildNflFeedUrl(filters: NflEventFilters): string {
  const params = new URLSearchParams();
  if (filters.teamIds.length > 0) {
    params.set("teamIds", filters.teamIds.join(","));
  }
  return buildCalendarFeedUrl("nfl", params);
}
