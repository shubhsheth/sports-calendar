/**
 * Joins the feed base URL, league slug, and query params into the live,
 * auto-updating `.ics` subscription feed URL. Defaults to the site's own origin
 * (`<origin>/calendar/...`), where Firebase Hosting rewrites `/calendar/**` to
 * the feed Cloud Function; `VITE_CALENDAR_FEED_BASE_URL` overrides it.
 */
export function buildCalendarFeedUrl(
  league: string,
  params: URLSearchParams
): string {
  const base =
    import.meta.env.VITE_CALENDAR_FEED_BASE_URL ||
    `${window.location.origin}/calendar`;
  const query = params.toString();
  return `${base}/${league}.ics${query ? `?${query}` : ""}`;
}

/** The personal combined feed URL for a calendar's secret token. */
export function buildMyCalendarFeedUrl(feedToken: string): string {
  return buildCalendarFeedUrl(`my/${feedToken}`, new URLSearchParams());
}
