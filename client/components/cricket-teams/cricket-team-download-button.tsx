import { useState } from "react";
import { createEvents } from "ics";
import fileDownload from "js-file-download";
import { CalendarPlus, Download, Loader2 } from "lucide-react";
import type {
  CricketNationalTeam,
  CricketTeamEvent,
  CricketTeamFilters,
} from "@sports-calendar/shared";
import { transformCricketTeamEventsToIcs } from "@sports-calendar/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddToCalendarFeedLinks from "@/components/base/add-to-calendar-feed-links";
import { analytics } from "@/lib/analytics";
import { buildCricketTeamFeedUrl } from "./utils/buildCricketTeamFeedUrl";

type CricketTeamDownloadButtonProps = {
  team: CricketNationalTeam;
  /** The already-filtered events currently shown on the page. */
  events: CricketTeamEvent[];
  filters: CricketTeamFilters;
};

/**
 * "Add to Calendar" — the same modal UX as the league pages: a one-time `.ics`
 * download of the (filtered) schedule plus the live-feed subscription links,
 * with the format filter encoded in the feed URL.
 */
export function CricketTeamDownloadButton({
  team,
  events,
  filters,
}: CricketTeamDownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const feedUrl = buildCricketTeamFeedUrl(team.id, filters.formats);

  const handleDownload = () => {
    setLoading(true);
    const result = createEvents(transformCricketTeamEventsToIcs(events));
    if (result.value) {
      fileDownload(
        new Blob([result.value], { type: "text/calendar" }),
        `${team.name.toLowerCase()}-cricket.ics`
      );
      analytics.calendarDownloaded("cricket-team");
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
          analytics.calendarDownloadOpened("cricket-team");
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
              that updates automatically as new series are announced.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-5 pt-2">
            <Button
              className="w-full"
              onClick={handleDownload}
              disabled={loading || events.length === 0}
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
          <AddToCalendarFeedLinks league="cricket-team" feedUrl={feedUrl} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CricketTeamDownloadButton;
