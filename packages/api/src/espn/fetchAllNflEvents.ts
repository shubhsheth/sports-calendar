import type { NflEvent } from "@sports-calendar/shared";
import { fetchEventDetails } from "@sports-calendar/shared";
import { mapWithConcurrency } from "./mapWithConcurrency";
import { fetchAllEventRefs } from "./fetchAllEventRefs";

export async function fetchAllNflEvents(): Promise<NflEvent[]> {
  const refs = await fetchAllEventRefs("football", "nfl", "2025", [1, 2, 3]);
  return mapWithConcurrency(refs, 8, ref =>
    fetchEventDetails<NflEvent>(ref.$ref)
  );
}
