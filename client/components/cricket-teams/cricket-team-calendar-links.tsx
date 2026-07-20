import { useState } from "react";
import { createEvents } from "ics";
import fileDownload from "js-file-download";
import { Download, Loader2 } from "lucide-react";
import type {
  CricketNationalTeam,
  CricketTeamEvent,
  CricketTeamFilters,
} from "@sports-calendar/shared";
import { transformCricketTeamEventsToIcs } from "@sports-calendar/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddToCalendarFeedLinks from "@/components/base/add-to-calendar-feed-links";
import SaveLeagueButton from "@/components/base/save-league-button";
import { buildCricketTeamFeedUrl } from "./utils/buildCricketTeamFeedUrl";

type CricketTeamCalendarLinksProps = {
  team: CricketNationalTeam;
  /** The already-filtered events currently shown on the page. */
  events: CricketTeamEvent[];
  filters: CricketTeamFilters;
};

/**
 * The team page's calendar affordances: a one-time `.ics` download of the
 * filtered schedule (events are already fetched and filtered by the page) and
 * the standard Copy / Apple / Google links for the team's live feed, with the
 * format filter encoded in the feed URL.
 */
export function CricketTeamCalendarLinks({
  team,
  events,
  filters,
}: CricketTeamCalendarLinksProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    try {
      const result = createEvents(transformCricketTeamEventsToIcs(events));
      if (result.value) {
        fileDownload(result.value, `${team.name.toLowerCase()}-cricket.ics`);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">Add to your calendar</CardTitle>
      </CardHeader>
      <CardContent className="pb-0 grid gap-2">
        <Button
          className="w-full"
          variant="outline"
          onClick={handleDownload}
          disabled={downloading || events.length === 0}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          Download .ics
        </Button>
        <SaveLeagueButton
          league="cricket-team"
          subscriptionFilters={{ teamId: team.id, formats: filters.formats }}
        />
      </CardContent>
      <AddToCalendarFeedLinks
        league="cricket-team"
        feedUrl={buildCricketTeamFeedUrl(team.id, filters.formats)}
      />
    </Card>
  );
}
