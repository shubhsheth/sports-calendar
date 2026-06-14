import type { NbaEventFilters } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

export function buildNbaFeedUrl(filters: NbaEventFilters): string {
  const params = new URLSearchParams();
  if (filters.teamIds.length > 0) {
    params.set("teamIds", filters.teamIds.join(","));
  }
  return buildCalendarFeedUrl("nba", params);
}
