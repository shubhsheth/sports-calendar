import type { Context } from "hono";
import { createEvents } from "ics";
import {
  filterNbaEvents,
  transformNbaEventsToIcs,
} from "@sports-calendar/shared";
import { fetchAllNbaEvents } from "../espn/fetchAllNbaEvents";
import { parseNbaParams } from "../params";
import { icsHeaders } from "../icsHeaders";
import { withCache } from "../cache";
import { EspnFetchError } from "../errors";

export async function nbaRoute(c: Context): Promise<Response> {
  const params = parseNbaParams(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  let icsText: string;
  try {
    icsText = await withCache(c.req.url, 3600, async () => {
      let events;
      try {
        events = await fetchAllNbaEvents();
      } catch (err) {
        throw new EspnFetchError(String(err));
      }
      const filtered = filterNbaEvents(events, params.value);
      const icsAttrs = transformNbaEventsToIcs(filtered);
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
