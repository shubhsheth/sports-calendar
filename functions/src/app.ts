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
  fetchAllCricketTeamEvents,
  filterCricketTeamEvents,
  transformCricketTeamEventsToIcs,
} from "@sports-calendar/shared";
import {
  parseCricketTeamParams,
  parseNbaParams,
  parseNflParams,
  parseF1Params,
  parseIplParams,
  parseFifaParams,
  type ParseResult,
} from "./params";
import { icsHeaders } from "./icsHeaders";
import { fetchCalendarByToken } from "./personalCalendar";
import { buildCombinedIcsEvents } from "./personalFeed";

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

/** `<teamId>.ics` — team ids are numeric; anything else 404s before validation. */
const CRICKET_TEAM_FILE_PATTERN = /^(\d+)\.ics$/;

/**
 * Cricket team feed: every match the team plays across all its series. Unlike
 * the league routes there is no fixed season — each request re-runs series
 * discovery, so newly announced tours appear in subscribed calendars without
 * user action. Same parse → fetch → filter → transform tail as the leagues.
 */
app.get("/calendar/cricket-team/:file", async (c: Context) => {
  const match = CRICKET_TEAM_FILE_PATTERN.exec(c.req.param("file") ?? "");
  if (!match) return c.text("Not Found", 404);

  const parsed = parseCricketTeamParams(match[1], c.req.query());
  if (!parsed.ok) return c.text(parsed.error, 400);

  const events = await fetchAllCricketTeamEvents(match[1]);
  const filtered = filterCricketTeamEvents(events, parsed.value);
  const result = createEvents(transformCricketTeamEventsToIcs(filtered));
  if (!result.value) {
    console.error("Failed to create iCal:", result.error);
    return c.text("Failed to generate calendar", 500);
  }

  return new Response(result.value, { headers: icsHeaders() });
});

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
