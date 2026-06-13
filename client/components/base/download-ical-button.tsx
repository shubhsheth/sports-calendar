import { createEvents, type EventAttributes } from "ics";
import fileDownload from "js-file-download";
import { CalendarPlus, Download, Loader2 } from "lucide-react";
import type { BaseEvent, EventRef } from "@sports-calendar/shared";
import { Button } from "@/components/ui/button";
import type { FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { fetchEventDetails } from "@/api/espn/fetchEventDetails";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { analytics } from "@/lib/analytics";

type DownloadIcalButtonProps<T extends BaseEvent, F> = {
  league: string;
  seasonTypeIds: number[];
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number
  ) => Promise<FetchEventRefsResponse>;
  transformEventsToIcsFn: (events: T[]) => EventAttributes[];
  filterEvents: (events: T[], filters: F) => T[];
  eventFilters: F;
  filename?: string;
};

function DownloadIcalButton<T extends BaseEvent, F>({
  league,
  seasonTypeIds,
  fetchEventRefsFn,
  transformEventsToIcsFn,
  filterEvents,
  eventFilters,
  filename = "calendar.ics",
}: DownloadIcalButtonProps<T, F>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const buildIcsBlob = async (): Promise<Blob | null> => {
    const allEvents = await fetchAllEvents<T>(
      queryClient,
      league,
      fetchEventRefsFn,
      seasonTypeIds
    );
    const filteredEvents = filterEvents(allEvents, eventFilters);
    const eventIcs = transformEventsToIcsFn(filteredEvents);
    const result = createEvents(eventIcs);
    if (!result.value) {
      console.error("Failed to create iCal:", result.error);
      return null;
    }
    return new Blob([result.value], { type: "text/calendar" });
  };

  const handleDownload = async () => {
    setLoading(true);
    const blob = await buildIcsBlob();
    if (blob) {
      fileDownload(blob, filename);
      analytics.calendarDownloaded(league);
    }
    setLoading(false);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          setOpen(true);
          analytics.calendarDownloadOpened(league);
        }}
      >
        <CalendarPlus className="size-4" aria-hidden />
        Add to Calendar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Calendar</DialogTitle>
            <DialogDescription>
              Download a calendar file to import into your calendar app.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-5 pt-2">
            <Button
              className="w-full"
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Preparing…
                </>
              ) : (
                <>
                  <Download className="size-4" aria-hidden />
                  Download .ics
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DownloadIcalButton;

async function fetchAllEvents<T>(
  queryClient: QueryClient,
  league: string,
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number
  ) => Promise<FetchEventRefsResponse>,
  seasonTypeIds: number[]
): Promise<T[]> {
  const allEventRefs = await fetchAllEventRefs(
    queryClient,
    league,
    fetchEventRefsFn,
    seasonTypeIds
  );
  const allEventDetails = await fetchAllEventDetails<T>(
    queryClient,
    league,
    allEventRefs
  );

  return allEventDetails;
}

async function fetchAllEventRefs(
  queryClient: QueryClient,
  league: string,
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number
  ) => Promise<FetchEventRefsResponse>,
  seasonTypeIds: number[]
): Promise<EventRef[]> {
  const infiniteQueryKey = [league, "events", "infinite"];

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

  // Convert pages to flat map of refs
  const allEventRefPages = [...cachedPages, ...remainingPages];
  return allEventRefPages.flatMap(page => page.items);
}

async function fetchAllEventDetails<T>(
  queryClient: QueryClient,
  league: string,
  allEventRefs: EventRef[]
): Promise<T[]> {
  const FETCH_CONCURRENCY = 8;

  const allEvents = await mapWithConcurrency<T>(
    allEventRefs,
    FETCH_CONCURRENCY,
    ref => {
      return queryClient.ensureQueryData({
        queryKey: [league, "event", ref.$ref],
        queryFn: () => fetchEventDetails<T>(ref.$ref),
      });
    }
  );

  return allEvents;
}

async function mapWithConcurrency<T>(
  items: EventRef[],
  limit: number,
  mapper: (item: EventRef) => Promise<T>
): Promise<T[]> {
  const results: T[] = new Array(items.length);
  let index = 0;

  async function runNext(): Promise<void> {
    if (index >= items.length) return;
    const current = index++;
    results[current] = await mapper(items[current]);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    runNext()
  );
  await Promise.all(workers);
  return results;
}
