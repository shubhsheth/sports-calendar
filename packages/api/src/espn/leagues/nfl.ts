import type { NflEvent } from "@sports-calendar/shared";
import { fetchAllEventRefsBySeason } from "../fetchEventRefs.ts";
import { fetchEventDetails } from "../fetchEventDetails.ts";
import { mapWithConcurrency } from "../concurrency.ts";

export async function fetchAllNflEvents(): Promise<NflEvent[]> {
  const refs = await fetchAllEventRefsBySeason(
    "football",
    "nfl",
    "2025",
    [1, 2, 3] // preseason, regular, playoffs
  );
  return mapWithConcurrency(refs, 8, ref => fetchEventDetails<NflEvent>(ref.$ref));
}
