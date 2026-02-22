import { createEvents, type EventAttributes } from "ics";
import fileDownload from "js-file-download";
import { Download } from "lucide-react";
import type { BaseEvent, EventRef } from "@/types/base";
import { Button } from "@/components/ui/button";
import type { FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { fetchEventDetails } from "@/api/espn/fetchEventDetails";
import { useState } from "react";

type DownloadIcalButtonProps<T extends BaseEvent, F> = {
  fetchEventRefsFn: (pageParam: number) => Promise<FetchEventRefsResponse>;
  transformEventsToIcsFn: (events: T[]) => EventAttributes[];
  filterEvents: (events: T[], filters: F) => T[];
  eventFilters: F;
  baseQueryKey: string;
  filename?: string;
};

function DownloadIcalButton<T extends BaseEvent, F>({
  fetchEventRefsFn,
  transformEventsToIcsFn,
  filterEvents,
  eventFilters,
  baseQueryKey,
  filename = "calendar.ics",
}: DownloadIcalButtonProps<T, F>) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    // Fetch all event details
    const allEvents = await fetchAllEvents<T>(
      queryClient,
      baseQueryKey,
      fetchEventRefsFn,
    );

    // Filter, Transform and Create ICS File
    const filteredEvents = filterEvents(allEvents, eventFilters);
    const eventIcs = transformEventsToIcsFn(filteredEvents);
    const result = createEvents(eventIcs);

    setLoading(false);

    // Initiate ICS File download
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

export default DownloadIcalButton;

async function fetchAllEvents<T>(
  queryClient: QueryClient,
  baseQueryKey: string,
  fetchEventRefsFn: (pageParam: number) => Promise<FetchEventRefsResponse>,
): Promise<T[]> {
  const allEventRefs = await fetchAllEventRefs(
    queryClient,
    baseQueryKey,
    fetchEventRefsFn,
  );
  const allEventDetails = await fetchAllEventDetails<T>(
    queryClient,
    baseQueryKey,
    allEventRefs,
  );

  return allEventDetails;
}

async function fetchAllEventRefs(
  queryClient: QueryClient,
  baseQueryKey: string,
  fetchEventRefsFn: (pageParam: number) => Promise<FetchEventRefsResponse>,
): Promise<EventRef[]> {
  const infiniteQueryKey = [baseQueryKey, "events", "infinite"];

  // Fetch all event refs from cache
  const infiniteData = queryClient.getQueryData<{
    pages: FetchEventRefsResponse[];
  }>(infiniteQueryKey);
  const cachedPages = infiniteData?.pages ?? [];

  // Fetch remaining event refs from API
  const remainingPages: FetchEventRefsResponse[] = [];
  let currentPage = cachedPages.length ? cachedPages.length + 1 : 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const pageData = await fetchEventRefsFn(currentPage);
    remainingPages.push(pageData);
    hasMorePages = pageData.pageIndex < pageData.pageCount;
    currentPage++;
  }

  // Convert pages to flat map of refs
  const allEventRefPages = [...cachedPages, ...remainingPages];
  return allEventRefPages.flatMap((page) => page.items);
}

async function fetchAllEventDetails<T>(
  queryClient: QueryClient,
  baseQueryKey: string,
  allEventRefs: EventRef[],
): Promise<T[]> {
  const FETCH_CONCURRENCY = 8;

  const allEvents = await mapWithConcurrency<T>(
    allEventRefs,
    FETCH_CONCURRENCY,
    (ref) => {
      return queryClient.ensureQueryData({
        queryKey: [baseQueryKey, "event", ref.$ref],
        queryFn: () => fetchEventDetails<T>(ref.$ref),
      });
    },
  );

  return allEvents;
}

async function mapWithConcurrency<T>(
  items: EventRef[],
  limit: number,
  mapper: (item: EventRef) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    // 1. Create the task and ensure it removes itself from 'executing' when done
    const p = (async () => {
      const result = await mapper(item);
      results.push(result);
    })().then(() => {
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);

    // 2. If we hit the limit, wait for at least one task to clear out
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  // 3. Wait for the final batch to cross the finish line
  await Promise.all(executing);
  return results;
}
