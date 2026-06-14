type CalendarFeedFilters = {
  teamIds?: string[];
  types?: string[];
};

/**
 * Builds the live, auto-updating `.ics` subscription feed URL served by the
 * Supabase Edge Function, or `null` if `VITE_CALENDAR_FEED_BASE_URL` isn't configured.
 */
export function buildCalendarFeedUrl(
  league: string,
  filters: CalendarFeedFilters
): string | null {
  const base = import.meta.env.VITE_CALENDAR_FEED_BASE_URL;
  if (!base) return null;

  const params = new URLSearchParams();
  if (filters.teamIds && filters.teamIds.length > 0) {
    params.set("teamIds", filters.teamIds.join(","));
  }
  if (filters.types && filters.types.length > 0) {
    params.set("types", filters.types.join(","));
  }

  const query = params.toString();
  return `${base}/${league}.ics${query ? `?${query}` : ""}`;
}
