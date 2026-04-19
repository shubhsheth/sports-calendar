import { Hono } from "hono";
import { createEvents } from "ics";
import {
  filterIplEvents,
  transformIplEventsToIcs,
} from "@sports-calendar/shared";
import { parseIplParams } from "../params.ts";
import { fetchAllIplEvents } from "../espn/leagues.ts";
import { withCache } from "../cache.ts";

export const iplRoute = new Hono();

iplRoute.get("/", async c => {
  const params = parseIplParams(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  return withCache(new Request(c.req.url), c.executionCtx, async () => {
    const events = await fetchAllIplEvents();
    const filtered = filterIplEvents(events, params.value);
    const { value: icsString, error } = createEvents(
      transformIplEventsToIcs(filtered)
    );
    if (!icsString) throw new Error(`ICS generation failed: ${String(error)}`);
    return icsString;
  });
});
