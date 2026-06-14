import { useState } from "react";
import { createEvents } from "ics";
import fileDownload from "js-file-download";
import { CalendarPlus, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IplEvent, IplEventFilters } from "@sports-calendar/shared";
import {
  fetchIplEventsByDate,
  getIplSeasonDates,
} from "./utils/fetchIplEvents";
import { filterIplEvents } from "./utils/filterIplEvents";
import { transformIplEventsToIcs } from "./utils/transformIplEventsToIcs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { analytics } from "@/lib/analytics";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";
import AddToCalendarFeedLinks from "@/components/base/add-to-calendar-feed-links";

type IplDownloadIcalButtonProps = {
  filters: IplEventFilters;
  filename?: string;
};

function IplDownloadIcalButton({
  filters,
  filename = "ipl-calendar.ics",
}: IplDownloadIcalButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const feedUrl = buildCalendarFeedUrl("ipl", filters);

  const buildIcsBlob = async (): Promise<Blob | null> => {
    const dates = getIplSeasonDates();
    const allEvents = await mapWithConcurrency(dates, 10, date =>
      fetchIplEventsByDate(date)
    );
    const flatEvents = allEvents.flat() as IplEvent[];
    const filteredEvents = filterIplEvents(flatEvents, filters);
    const icsEvents = transformIplEventsToIcs(filteredEvents);
    const result = createEvents(icsEvents);
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
      analytics.calendarDownloaded("ipl");
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
          analytics.calendarDownloadOpened("ipl");
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
              Download a one-time calendar file, or subscribe to a live feed
              that updates automatically.
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
          <AddToCalendarFeedLinks league="ipl" feedUrl={feedUrl} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default IplDownloadIcalButton;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
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
