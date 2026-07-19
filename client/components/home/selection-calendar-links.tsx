import { useState } from "react";
import { createEvents, type EventAttributes } from "ics";
import fileDownload from "js-file-download";
import { Download, Loader2 } from "lucide-react";
import {
  CRICKET_NATIONAL_TEAMS,
  transformCricketTeamEventsToIcs,
  transformF1EventsToIcs,
  transformFifaEventsToIcs,
  transformIplEventsToIcs,
  transformNbaEventsToIcs,
  transformNflEventsToIcs,
} from "@sports-calendar/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddToCalendarFeedLinks from "@/components/base/add-to-calendar-feed-links";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";
import { buildCricketTeamFeedUrl } from "@/components/cricket-teams/utils/buildCricketTeamFeedUrl";
import {
  HOME_LEAGUE_OPTIONS,
  type HomeSelection,
} from "./utils/selectionState";
import type { CombinedEntry } from "./utils/useCombinedSchedule";

type SelectionCalendarLinksProps = {
  selection: HomeSelection;
  entries: CombinedEntry[];
};

/** Transforms the merged entries to ICS via each source's own transform. */
function entriesToIcs(entries: CombinedEntry[]): EventAttributes[] {
  const bySource = <S extends CombinedEntry["source"]>(source: S) =>
    entries.filter(e => e.source === source).map(e => e.event) as Extract<
      CombinedEntry,
      { source: S }
    >["event"][];

  return [
    ...transformCricketTeamEventsToIcs(bySource("cricket-team")),
    ...transformNbaEventsToIcs(bySource("nba")),
    ...transformNflEventsToIcs(bySource("nfl")),
    ...transformF1EventsToIcs(bySource("f1")),
    ...transformIplEventsToIcs(bySource("ipl")),
    ...transformFifaEventsToIcs(bySource("fifa")),
  ];
}

/**
 * Download + live-feed affordances for the current home selection. The
 * download exports exactly what the merged schedule shows (already filtered);
 * live feeds are per source — one for each selected cricket team (with the
 * format filter encoded) and one per selected league.
 */
export function SelectionCalendarLinks({
  selection,
  entries,
}: SelectionCalendarLinksProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    try {
      const result = createEvents(entriesToIcs(entries));
      if (result.value) {
        fileDownload(result.value, "sports-calendar.ics");
      }
    } finally {
      setDownloading(false);
    }
  };

  const selectedTeams = CRICKET_NATIONAL_TEAMS.filter(t =>
    selection.teamIds.includes(t.id)
  );
  const selectedLeagues = HOME_LEAGUE_OPTIONS.filter(o =>
    selection.leagues.includes(o.id)
  );

  return (
    <Card className="max-w-3xl mx-auto w-full">
      <CardHeader>
        <CardTitle className="text-base">Add to your calendar</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={downloading || entries.length === 0}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          Download .ics of this selection
        </Button>

        <div className="grid gap-2">
          {selectedTeams.map(team => (
            <details key={team.id} className="rounded-lg border">
              <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
                {team.name} live feed
              </summary>
              <AddToCalendarFeedLinks
                league="cricket-team"
                feedUrl={buildCricketTeamFeedUrl(team.id, selection.formats)}
              />
            </details>
          ))}
          {selectedLeagues.map(league => (
            <details key={league.id} className="rounded-lg border">
              <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
                {league.label} live feed
              </summary>
              <AddToCalendarFeedLinks
                league={league.id}
                feedUrl={buildCalendarFeedUrl(league.id, new URLSearchParams())}
              />
            </details>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
