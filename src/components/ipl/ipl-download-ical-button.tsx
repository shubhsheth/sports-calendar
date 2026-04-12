import { useState } from "react";
import { createEvents } from "ics";
import fileDownload from "js-file-download";
import {
  CalendarPlus,
  CalendarDays,
  Download,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IplEvent, IplEventFilters } from "@/types/ipl";
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

type LoadingOption = "google" | "apple" | "other" | null;

type IplDownloadIcalButtonProps = {
  filters: IplEventFilters;
  filename?: string;
};

function IplDownloadIcalButton({
  filters,
  filename = "ipl-calendar.ics",
}: IplDownloadIcalButtonProps) {
  const [open, setOpen] = useState(false);
  const [loadingOption, setLoadingOption] = useState<LoadingOption>(null);

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
              Add all IPL season matches to your calendar app.
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
