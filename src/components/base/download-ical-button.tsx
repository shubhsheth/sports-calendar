import { createEvents, type EventAttributes } from "ics";
import fileDownload from "js-file-download";
import {
  CalendarPlus,
  CalendarDays,
  Download,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { BaseEvent, EventRef } from "@/types/base";
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

type LoadingOption = "google" | "apple" | "other" | null;

type DownloadIcalButtonProps<T extends BaseEvent, F> = {
  seasonTypeIds: number[];
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number
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
  const [open, setOpen] = useState(false);
  const [loadingOption, setLoadingOption] = useState<LoadingOption>(null);

  const buildIcsBlob = async (): Promise<Blob | null> => {
    const allEvents = await fetchAllEvents<T>(
      queryClient,
      baseQueryKey,
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

  const handleGoogleCalendar = async () => {
    setLoadingOption("google");
    const blob = await buildIcsBlob();
    if (blob) {
      fileDownload(blob, filename);
      window.open(
        "https://calendar.google.com/calendar/r/settings/import",
        "_blank"
      );
    }
    setLoadingOption(null);
    setOpen(false);
  };

  const handleAppleCalendar = async () => {
    setLoadingOption("apple");
    const blob = await buildIcsBlob();
    if (blob) {
      const file = new File([blob], filename, { type: "text/calendar" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
        } catch (err) {
          // User cancelled share or share failed — fall back to download
          if ((err as DOMException).name !== "AbortError") {
            fileDownload(blob, filename);
          }
        }
      } else {
        fileDownload(blob, filename);
      }
    }
    setLoadingOption(null);
    setOpen(false);
  };

  const handleOther = async () => {
    setLoadingOption("other");
    const blob = await buildIcsBlob();
    if (blob) {
      fileDownload(blob, filename);
    }
    setLoadingOption(null);
    setOpen(false);
  };

  const isMobileShareSupported =
    typeof navigator !== "undefined" && !!navigator.canShare;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" aria-hidden />
        Add to Calendar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Calendar</DialogTitle>
            <DialogDescription>
              Add all season games to your calendar app.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col divide-y border-t">
            <CalendarOptionRow
              icon={
                <CalendarDays className="size-5 text-blue-500" aria-hidden />
              }
              label="Google Calendar"
              description="Download & import into Google Calendar"
              loading={loadingOption === "google"}
              disabled={loadingOption !== null}
              onClick={handleGoogleCalendar}
            />
            <CalendarOptionRow
              icon={
                <CalendarDays className="size-5 text-gray-500" aria-hidden />
              }
              label="Apple Calendar"
              description={
                isMobileShareSupported
                  ? "Add via iOS share sheet"
                  : "Download .ics file"
              }
              loading={loadingOption === "apple"}
              disabled={loadingOption !== null}
              onClick={handleAppleCalendar}
            />
            <CalendarOptionRow
              icon={<Download className="size-5" aria-hidden />}
              label="Download .ics"
              description="Universal calendar format"
              loading={loadingOption === "other"}
              disabled={loadingOption !== null}
              onClick={handleOther}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type CalendarOptionRowProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
};

function CalendarOptionRow({
  icon,
  label,
  description,
  loading,
  disabled,
  onClick,
}: CalendarOptionRowProps) {
  return (
    <button
      className="flex items-center gap-4 px-5 py-4 w-full text-left transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {loading ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ChevronRight
        className="size-4 text-muted-foreground shrink-0"
        aria-hidden
      />
    </button>
  );
}

export default DownloadIcalButton;

async function fetchAllEvents<T>(
  queryClient: QueryClient,
  baseQueryKey: string,
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number
  ) => Promise<FetchEventRefsResponse>,
  seasonTypeIds: number[]
): Promise<T[]> {
  const allEventRefs = await fetchAllEventRefs(
    queryClient,
    baseQueryKey,
    fetchEventRefsFn,
    seasonTypeIds
  );
  const allEventDetails = await fetchAllEventDetails<T>(
    queryClient,
    baseQueryKey,
    allEventRefs
  );

  return allEventDetails;
}

async function fetchAllEventRefs(
  queryClient: QueryClient,
  baseQueryKey: string,
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number
  ) => Promise<FetchEventRefsResponse>,
  seasonTypeIds: number[]
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

  // Convert pages to flat map of refs
  const allEventRefPages = [...cachedPages, ...remainingPages];
  return allEventRefPages.flatMap(page => page.items);
}

async function fetchAllEventDetails<T>(
  queryClient: QueryClient,
  baseQueryKey: string,
  allEventRefs: EventRef[]
): Promise<T[]> {
  const FETCH_CONCURRENCY = 8;

  const allEvents = await mapWithConcurrency<T>(
    allEventRefs,
    FETCH_CONCURRENCY,
    ref => {
      return queryClient.ensureQueryData({
        queryKey: [baseQueryKey, "event", ref.$ref],
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
