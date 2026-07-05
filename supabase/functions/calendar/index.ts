import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { createEvents, type EventAttributes } from "ics";
import {
  fetchAllNbaEvents,
  filterNbaEvents,
  transformNbaEventsToIcs,
  fetchAllNflEvents,
  filterNflEvents,
  transformNflEventsToIcs,
  fetchAllF1Events,
  filterF1Events,
  transformF1EventsToIcs,
  fetchAllIplEvents,
  filterIplEvents,
  transformIplEventsToIcs,
  fetchAllFifaEvents,
  filterFifaEvents,
  transformFifaEventsToIcs,
} from "@sports-calendar/shared";
import {
  parseNbaParams,
  parseNflParams,
  parseF1Params,
  parseIplParams,
  parseFifaParams,
  type ParseResult,
} from "../_shared/params.ts";
import { icsHeaders } from "../_shared/icsHeaders.ts";
import { fetchCalendarByToken } from "../_shared/personalCalendar.ts";
import { buildCombinedIcsEvents } from "./personalFeed.ts";

export const app = new Hono();

app.use("*", cors());

/**
 * Wire up one league's `.ics` route. Every league follows the same pipeline —
 * parse query params, fetch from ESPN, filter, transform to ICS events, then
 * serialize — so the only per-league differences are the four functions passed in.
 */
function registerLeagueRoute<TEvent, TFilters>(
  path: string,
  parseParams: (query: Record<string, string>) => ParseResult<TFilters>,
  fetchEvents: () => Promise<TEvent[]>,
  filterEvents: (events: TEvent[], filters: TFilters) => TEvent[],
  transformToIcs: (events: TEvent[]) => EventAttributes[]
) {
  app.get(path, async (c: Context) => {
    const parsed = parseParams(c.req.query());
    if (!parsed.ok) return c.text(parsed.error, 400);

    const events = await fetchEvents();
    const filtered = filterEvents(events, parsed.value);
    const icsEvents = transformToIcs(filtered);

    const result = createEvents(icsEvents);
    if (!result.value) {
      console.error("Failed to create iCal:", result.error);
      return c.text("Failed to generate calendar", 500);
    }

    return new Response(result.value, { headers: icsHeaders() });
  });
}

registerLeagueRoute(
  "/calendar/nba.ics",
  parseNbaParams,
  fetchAllNbaEvents,
  filterNbaEvents,
  transformNbaEventsToIcs
);
registerLeagueRoute(
  "/calendar/nfl.ics",
  parseNflParams,
  fetchAllNflEvents,
  filterNflEvents,
  transformNflEventsToIcs
);
registerLeagueRoute(
  "/calendar/f1.ics",
  parseF1Params,
  fetchAllF1Events,
  filterF1Events,
  transformF1EventsToIcs
);
registerLeagueRoute(
  "/calendar/ipl.ics",
  parseIplParams,
  fetchAllIplEvents,
  filterIplEvents,
  transformIplEventsToIcs
);
registerLeagueRoute(
  "/calendar/fifa.ics",
  parseFifaParams,
  fetchAllFifaEvents,
  filterFifaEvents,
  transformFifaEventsToIcs
);

/** `<feed_token>.ics` — tokens are UUIDs, anything else 404s without a lookup. */
const FEED_FILE_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.ics$/i;

/**
 * Personal combined feed: the union of every league subscription (with its
 * stored filters) and every pinned event on the calendar identified by the
 * secret token, deduped by UID. Same pipeline functions as the league routes.
 */
app.get("/calendar/my/:file", async (c: Context) => {
  const match = FEED_FILE_PATTERN.exec(c.req.param("file") ?? "");
  if (!match) return c.text("Not Found", 404);

  const calendar = await fetchCalendarByToken(match[1]);
  if (!calendar) return c.text("Not Found", 404);

  const icsEvents = await buildCombinedIcsEvents(calendar);
  const result = createEvents(icsEvents);
  if (!result.value) {
    console.error("Failed to create iCal:", result.error);
    return c.text("Failed to generate calendar", 500);
  }

  return new Response(result.value, { headers: icsHeaders() });
});

app.notFound(c => c.text("Not Found", 404));

Deno.serve(app.fetch);
