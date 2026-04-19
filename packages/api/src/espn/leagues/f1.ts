import type { F1Event } from "@sports-calendar/shared";
import { fetchAllEventRefsBySeason } from "../fetchEventRefs.ts";
import { fetchEventDetails } from "../fetchEventDetails.ts";
import { mapWithConcurrency } from "../concurrency.ts";

export async function fetchAllF1Events(): Promise<F1Event[]> {
  const refs = await fetchAllEventRefsBySeason(
    "racing",
    "f1",
    "2026",
    [2] // regular season
  );
  return mapWithConcurrency(refs, 8, ref => fetchEventDetails<F1Event>(ref.$ref));
}
