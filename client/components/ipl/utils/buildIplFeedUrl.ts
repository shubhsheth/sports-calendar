import type { IplEventFilters } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

export function buildIplFeedUrl(filters: IplEventFilters): string {
  const params = new URLSearchParams();
  if (filters.teamIds.length > 0) {
    params.set("teamIds", filters.teamIds.join(","));
  }
  return buildCalendarFeedUrl("ipl", params);
}
