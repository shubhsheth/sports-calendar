import { useState } from "react";
import { createEvents } from "ics";
import fileDownload from "js-file-download";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IplEvent, IplEventFilters } from "@/types/ipl";
import {
  fetchIplEventsByDate,
  getIplSeasonDates,
} from "./utils/fetchIplEvents";
import { filterIplEvents } from "./utils/filterIplEvents";
import { transformIplEventsToIcs } from "./utils/transformIplEventsToIcs";

type IplDownloadIcalButtonProps = {
  filters: IplEventFilters;
  filename?: string;
};

function IplDownloadIcalButton({
  filters,
  filename = "ipl-calendar.ics",
}: IplDownloadIcalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    const dates = getIplSeasonDates();
    const allEvents = await mapWithConcurrency(dates, 10, date =>
      fetchIplEventsByDate(date)
    );
    const flatEvents = allEvents.flat() as IplEvent[];

    const filteredEvents = filterIplEvents(flatEvents, filters);
    const icsEvents = transformIplEventsToIcs(filteredEvents);
    const result = createEvents(icsEvents);

    setLoading(false);

    if (result.value) {
      const blob = new Blob([result.value], { type: "text/calendar" });
      fileDownload(blob, filename);
    } else if (result.error) {
      console.error("Failed to create iCal:", result.error);
    }
  };

  return (
    <Button variant="default" onClick={handleClick} disabled={loading}>
      <Download className="size-4" aria-hidden />
      Download as iCal
    </Button>
  );
}

export default IplDownloadIcalButton;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = (async () => {
      const result = await mapper(item);
      results.push(result);
    })().then(() => {
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
