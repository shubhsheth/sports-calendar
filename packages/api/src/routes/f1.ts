import { Hono } from "hono";
import { createEvents } from "ics";
import {
  filterF1Events,
  transformF1EventsToIcs,
} from "@sports-calendar/shared";
import { parseF1Params } from "../params.ts";
import { fetchAllF1Events } from "../espn/leagues.ts";
import { withCache } from "../cache.ts";

export const f1Route = new Hono();

f1Route.get("/", async c => {
  const params = parseF1Params(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  return withCache(new Request(c.req.url), c.executionCtx, async () => {
    const events = await fetchAllF1Events();
    const filtered = filterF1Events(events, params.value);
    const { value: icsString, error } = createEvents(
      transformF1EventsToIcs(filtered)
    );
    if (!icsString) throw new Error(`ICS generation failed: ${String(error)}`);
    return icsString;
  });
});
