import type { F1EventFilters } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

export function buildF1FeedUrl(filters: F1EventFilters): string {
  const params = new URLSearchParams();
  if (filters.types.length > 0) {
    params.set("types", filters.types.join(","));
  }
  // showPastEvents is intentionally omitted: the live feed always includes past events.
  return buildCalendarFeedUrl("f1", params);
}
