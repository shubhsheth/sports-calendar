import type { Context } from "hono";
import { createEvents } from "ics";
import {
  filterIplEvents,
  transformIplEventsToIcs,
} from "@sports-calendar/shared";
import { fetchAllIplEvents } from "../espn/fetchAllIplEvents";
import { parseIplParams } from "../params";
import { icsHeaders } from "../icsHeaders";
import { withCache } from "../cache";
import { EspnFetchError } from "../errors";

export async function iplRoute(c: Context): Promise<Response> {
  const params = parseIplParams(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  let icsText: string;
  try {
    icsText = await withCache(c.req.url, 3600, async () => {
      let events;
      try {
        events = await fetchAllIplEvents();
      } catch (err) {
        throw new EspnFetchError(String(err));
      }
      const filtered = filterIplEvents(events, params.value);
      const icsAttrs = transformIplEventsToIcs(filtered);
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
