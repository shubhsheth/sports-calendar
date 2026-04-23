import type { Context } from "hono";
import { createEvents } from "ics";
import { filterF1Events, transformF1EventsToIcs } from "@sports-calendar/shared";
import { fetchAllF1Events } from "../espn/fetchAllF1Events";
import { parseF1Params } from "../params";
import { icsHeaders } from "../icsHeaders";
import { withCache } from "../cache";
import { EspnFetchError } from "../errors";

export async function f1Route(c: Context): Promise<Response> {
  const params = parseF1Params(c.req.query());
  if (!params.ok) return c.text(params.error, 400);

  let icsText: string;
  try {
    icsText = await withCache(c.req.url, 3600, async () => {
      let events;
      try {
        events = await fetchAllF1Events();
      } catch (err) {
        throw new EspnFetchError(String(err));
      }
      const filtered = filterF1Events(events, params.value);
      const icsAttrs = transformF1EventsToIcs(filtered);
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
