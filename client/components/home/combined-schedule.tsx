import { Checkbox } from "@/components/ui/checkbox";
import CricketTeamEventCard from "@/components/cricket-teams/cricket-team-event-card";
import NbaEventCard from "@/components/nba/nba-event-card";
import NflEventCard from "@/components/nfl/nfl-event-card";
import F1EventCard from "@/components/f1/f1-event-card";
import IplEventCard from "@/components/ipl/ipl-event-card";
import FifaEventCard from "@/components/fifa/fifa-event-card";
import type { CombinedEntry } from "./utils/useCombinedSchedule";

type CombinedScheduleProps = {
  entries: CombinedEntry[];
  isLoading: boolean;
  failedSources: string[];
  showPastEvents: boolean;
  onToggleShowPast: (show: boolean) => void;
};

// Entries were already filtered by useCombinedSchedule; the league cards
// re-filter internally, so hand them a filter that keeps everything.
const KEEP_ALL = { showPastEvents: true, teamIds: [] };
const KEEP_ALL_F1 = { showPastEvents: true, types: [] };

function EntryCard({ entry }: { entry: CombinedEntry }) {
  switch (entry.source) {
    case "cricket-team":
      return <CricketTeamEventCard event={entry.event} />;
    case "nba":
      return (
        <NbaEventCard league="nba" event={entry.event} filters={KEEP_ALL} />
      );
    case "nfl":
      return (
        <NflEventCard league="nfl" event={entry.event} filters={KEEP_ALL} />
      );
    case "f1":
      return (
        <F1EventCard league="f1" event={entry.event} filters={KEEP_ALL_F1} />
      );
    case "ipl":
      return <IplEventCard event={entry.event} filters={KEEP_ALL} />;
    case "fifa":
      return (
        <FifaEventCard league="fifa" event={entry.event} filters={KEEP_ALL} />
      );
  }
}

/** The merged chronological schedule of everything selected on home. */
export function CombinedSchedule({
  entries,
  isLoading,
  failedSources,
  showPastEvents,
  onToggleShowPast,
}: CombinedScheduleProps) {
  return (
    <div className="grid gap-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <Checkbox
          id="home-show-past"
          checked={showPastEvents}
          onCheckedChange={checked => onToggleShowPast(checked === true)}
        />
        <label htmlFor="home-show-past" className="text-sm">
          Show past events
        </label>
      </div>

      {failedSources.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load: {failedSources.join(", ")}. Other schedules are
          shown below.
        </p>
      )}

      {isLoading && (
        <div className="grid gap-4" aria-label="Loading schedule">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-40 w-full animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}

      {!isLoading && entries.length === 0 && failedSources.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No upcoming events for this selection.
        </p>
      )}

      <div className="grid gap-4">
        {entries.map(entry => (
          <EntryCard key={`${entry.source}-${entry.event.id}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}
