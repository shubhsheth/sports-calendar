import { Hono } from "hono";
import { createEvents } from "ics";
import {
  filterNbaEvents,
  transformNbaEventsToIcs,
} from "@sports-calendar/shared";
import { parseNbaParams } from "../params.ts";
import { fetchAllNbaEvents } from "../espn/leagues/nba.ts";
import { withCache } from "../cache.ts";

export const nbaRoute = new Hono();

nbaRoute.get("/", async c => {
  const params = parseNbaParams(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  return withCache(new Request(c.req.url), c.executionCtx, async () => {
    const events = await fetchAllNbaEvents();
    const filtered = filterNbaEvents(events, params.value);
    const { value: icsString, error } = createEvents(
      transformNbaEventsToIcs(filtered)
    );
    if (!icsString) throw new Error(`ICS generation failed: ${String(error)}`);
    return icsString;
  });
});
