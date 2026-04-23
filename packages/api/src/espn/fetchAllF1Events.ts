import type { F1Event } from "@sports-calendar/shared";
import { fetchEventDetails } from "@sports-calendar/shared";
import { mapWithConcurrency } from "./mapWithConcurrency";
import { fetchAllEventRefs } from "./fetchAllEventRefs";

export async function fetchAllF1Events(): Promise<F1Event[]> {
  const refs = await fetchAllEventRefs("racing", "f1", "2026", [2]);
  return mapWithConcurrency(refs, 8, ref =>
    fetchEventDetails<F1Event>(ref.$ref)
  );
}
