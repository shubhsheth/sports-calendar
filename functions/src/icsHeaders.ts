/**
 * Standard response headers for an ICS calendar feed:
 * - `Content-Type` marks the body as iCalendar (RFC 5545)
 * - `Cache-Control` caches locally 5 min but lets the Firebase Hosting CDN hold
 *   the response 1 hour (`s-maxage`), so calendar-app polls mostly hit the CDN,
 *   not this function
 * - `Access-Control-Allow-Origin` lets web-based calendar tools fetch the feed
 */
export function icsHeaders(): Headers {
  return new Headers({
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=3600",
    "Access-Control-Allow-Origin": "*",
  });
}
