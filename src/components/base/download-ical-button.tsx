import { createEvents, type EventAttributes } from "ics";
import fileDownload from "js-file-download";
import { Download } from "lucide-react";
import type { BaseEvent, EventRef } from "@/types/base";
import { Button } from "@/components/ui/button";
import type { FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { fetchEventDetails } from "@/api/espn/fetchEventDetails";
import { useState } from "react";

type SeasonCursor = { seasonTypeId: number; pageNumber: number };

type DownloadIcalButtonProps<T extends BaseEvent, F> = {
  seasonTypeIds: number[];
  fetchEventRefsFn: (cursor: SeasonCursor) => Promise<FetchEventRefsResponse>;
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

function getNextCursor(
  lastPage: FetchEventRefsResponse,
  lastCursor: SeasonCursor,
  seasonTypeIds: number[],
): SeasonCursor | undefined {
  if (lastPage.pageIndex < lastPage.pageCount) {
    return { seasonTypeId: lastCursor.seasonTypeId, pageNumber: lastCursor.pageNumber + 1 };
  }
  const currentIdx = seasonTypeIds.indexOf(lastCursor.seasonTypeId);
  const nextId = seasonTypeIds[currentIdx + 1];
  return nextId !== undefined ? { seasonTypeId: nextId, pageNumber: 1 } : undefined;
}

async function fetchAllEvents<T>(
  queryClient: QueryClient,
  baseQueryKey: string,
  fetchEventRefsFn: (cursor: SeasonCursor) => Promise<FetchEventRefsResponse>,
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
  fetchEventRefsFn: (cursor: SeasonCursor) => Promise<FetchEventRefsResponse>,
  seasonTypeIds: number[],
): Promise<EventRef[]> {
  const infiniteQueryKey = [baseQueryKey, "events", "infinite"];

  // Fetch all event refs from cache
  const infiniteData = queryClient.getQueryData<{
    pages: FetchEventRefsResponse[];
    pageParams: SeasonCursor[];
  }>(infiniteQueryKey);
  const cachedPages = infiniteData?.pages ?? [];
  const cachedPageParams = infiniteData?.pageParams ?? [];

  // Determine starting cursor for uncached pages
  let cursor: SeasonCursor | undefined;
  if (cachedPages.length > 0) {
    const lastCachedPage = cachedPages[cachedPages.length - 1];
    const lastCachedCursor = cachedPageParams[cachedPageParams.length - 1];
    cursor = getNextCursor(lastCachedPage, lastCachedCursor, seasonTypeIds);
  } else {
    cursor = { seasonTypeId: seasonTypeIds[0], pageNumber: 1 };
  }

  // Fetch remaining event refs from API
  const remainingPages: FetchEventRefsResponse[] = [];
  while (cursor !== undefined) {
    const pageData = await fetchEventRefsFn(cursor);
    remainingPages.push(pageData);
    cursor = getNextCursor(pageData, cursor, seasonTypeIds);
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
