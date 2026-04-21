import type { IplEvent } from "@sports-calendar/shared";
import { fetchIplEventsByDate, getIplSeasonDates } from "@sports-calendar/shared";
import { mapWithConcurrency } from "./mapWithConcurrency";

export async function fetchAllIplEvents(): Promise<IplEvent[]> {
  const dates = getIplSeasonDates();
  const batches = await mapWithConcurrency(dates, 8, date =>
    fetchIplEventsByDate(date)
  );
  return batches.flat();
}
