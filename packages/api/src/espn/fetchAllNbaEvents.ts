import type { NbaEvent } from "@sports-calendar/shared";
import { fetchEventDetails } from "@sports-calendar/shared";
import { mapWithConcurrency } from "./mapWithConcurrency";
import { fetchAllEventRefs } from "./fetchAllEventRefs";

export async function fetchAllNbaEvents(): Promise<NbaEvent[]> {
  const refs = await fetchAllEventRefs("basketball", "nba", "2026", [
    1, 2, 5, 3,
  ]);
  return mapWithConcurrency(refs, 8, ref =>
    fetchEventDetails<NbaEvent>(ref.$ref)
  );
}
