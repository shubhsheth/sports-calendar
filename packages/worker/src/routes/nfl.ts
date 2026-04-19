import { Hono } from "hono";
import { createEvents } from "ics";
import { filterNflEvents, transformNflEventsToIcs } from "@sports-calendar/shared";
import { parseNflParams } from "../params.ts";
import { fetchAllNflEvents } from "../espn/leagues.ts";
import { withCache } from "../cache.ts";

export const nflRoute = new Hono();

nflRoute.get("/", async c => {
  const params = parseNflParams(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  return withCache(new Request(c.req.url), c.executionCtx, async () => {
    const events = await fetchAllNflEvents();
    const filtered = filterNflEvents(events, params.value);
    const { value: icsString, error } = createEvents(transformNflEventsToIcs(filtered));
    if (!icsString) throw new Error(`ICS generation failed: ${String(error)}`);
    return icsString;
  });
});
