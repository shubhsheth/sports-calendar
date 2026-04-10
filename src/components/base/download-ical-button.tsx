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
  seasonTypeIds: number[];
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number,
  ) => Promise<FetchEventRefsResponse>;
  transformEventsToIcsFn: (events: T[]) => EventAttributes[];
  filterEvents: (events: T[], filters: F) => T[];
  eventFilters: F;
  baseQueryKey: string;
  filename?: string;
};

function DownloadIcalButton<T extends BaseEvent, F>({
  seasonTypeIds,
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
      seasonTypeIds,
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
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number,
  ) => Promise<FetchEventRefsResponse>,
  seasonTypeIds: number[],
): Promise<T[]> {
  const allEventRefs = await fetchAllEventRefs(
    queryClient,
    baseQueryKey,
    fetchEventRefsFn,
    seasonTypeIds,
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
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number,
  ) => Promise<FetchEventRefsResponse>,
  seasonTypeIds: number[],
): Promise<EventRef[]> {
  const infiniteQueryKey = [baseQueryKey, "events", "infinite"];

  // Read already-fetched refs from infinite scroll cache
  const infiniteData = queryClient.getQueryData<{
    pages: FetchEventRefsResponse[];
    pageParams: { seasonTypeId: number; pageNumber: number }[];
  }>(infiniteQueryKey);
  const cachedPages = infiniteData?.pages ?? [];
  const cachedPageParams = infiniteData?.pageParams ?? [];

  // Determine where to resume from after cached pages
  let seasonTypeIdx = 0;
  let pageNumber = 1;

  if (cachedPages.length > 0) {
    const lastPage = cachedPages[cachedPages.length - 1];
    const lastParam = cachedPageParams[cachedPageParams.length - 1];
    if (lastPage.pageIndex < lastPage.pageCount) {
      seasonTypeIdx = seasonTypeIds.indexOf(lastParam.seasonTypeId);
      pageNumber = lastParam.pageNumber + 1;
    } else {
      seasonTypeIdx = seasonTypeIds.indexOf(lastParam.seasonTypeId) + 1;
      pageNumber = 1;
    }
  }

  // Fetch remaining pages across all remaining season types
  const remainingPages: FetchEventRefsResponse[] = [];
  while (seasonTypeIdx < seasonTypeIds.length) {
    const seasonTypeId = seasonTypeIds[seasonTypeIdx];
    const pageData = await fetchEventRefsFn(pageNumber, seasonTypeId);
    remainingPages.push(pageData);
    if (pageData.pageIndex < pageData.pageCount) {
      pageNumber++;
    } else {
      seasonTypeIdx++;
      pageNumber = 1;
    }
  }

  return [...cachedPages, ...remainingPages].flatMap((page) => page.items);
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
