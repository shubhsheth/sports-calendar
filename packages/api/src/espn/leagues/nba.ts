import type { NbaEvent } from "@sports-calendar/shared";
import { fetchAllEventRefsBySeason } from "../fetchEventRefs.ts";
import { fetchEventDetails } from "../fetchEventDetails.ts";
import { mapWithConcurrency } from "../concurrency.ts";

export async function fetchAllNbaEvents(): Promise<NbaEvent[]> {
  const refs = await fetchAllEventRefsBySeason(
    "basketball",
    "nba",
    "2026",
    [1, 2, 5, 3] // preseason, regular, play-in, playoffs
  );
  return mapWithConcurrency(refs, 8, ref => fetchEventDetails<NbaEvent>(ref.$ref));
}
