/**
 * Joins the configured feed base URL, league slug, and query params into the
 * live, auto-updating `.ics` subscription feed URL served by the Supabase
 * Edge Function.
 */
export function buildCalendarFeedUrl(
  league: string,
  params: URLSearchParams
): string {
  const base = import.meta.env.VITE_CALENDAR_FEED_BASE_URL ?? "";
  const query = params.toString();
  return `${base}/${league}.ics${query ? `?${query}` : ""}`;
}
