import type { Context } from "hono";
import { createEvents } from "ics";
import {
  filterNflEvents,
  transformNflEventsToIcs,
} from "@sports-calendar/shared";
import { fetchAllNflEvents } from "../espn/fetchAllNflEvents";
import { parseNflParams } from "../params";
import { icsHeaders } from "../icsHeaders";
import { withCache } from "../cache";
import { EspnFetchError } from "../errors";

export async function nflRoute(c: Context): Promise<Response> {
  const params = parseNflParams(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  let icsText: string;
  try {
    icsText = await withCache(c.req.url, 3600, async () => {
      let events;
      try {
        events = await fetchAllNflEvents();
      } catch (err) {
        throw new EspnFetchError(String(err));
      }
      const filtered = filterNflEvents(events, params.value);
      const icsAttrs = transformNflEventsToIcs(filtered);
      const { error, value } = createEvents(icsAttrs);
      if (error) throw error;
      return value!;
    });
  } catch (err) {
    if (err instanceof EspnFetchError) return c.text("Bad Gateway", 502);
    return c.text("Internal Server Error", 500);
  }

  return new Response(icsText, { headers: icsHeaders() });
}
