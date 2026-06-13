/**
 * Standard response headers for an ICS calendar feed:
 * - `Content-Type` marks the body as iCalendar (RFC 5545)
 * - `Cache-Control` tells calendar clients to cache the feed locally for 1 hour
 * - `Access-Control-Allow-Origin` lets web-based calendar tools fetch the feed
 */
export function icsHeaders(): Headers {
  return new Headers({
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  });
}
