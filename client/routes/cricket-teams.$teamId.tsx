import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { CricketTeamFilters } from "@sports-calendar/shared";
import {
  CRICKET_NATIONAL_TEAMS,
  fetchAllCricketTeamEvents,
  filterCricketTeamEvents,
} from "@sports-calendar/shared";
import SaveLeagueButton from "@/components/base/save-league-button";
import CricketTeamEventCard from "@/components/cricket-teams/cricket-team-event-card";
import { CricketTeamFilterSelector } from "@/components/cricket-teams/cricket-team-filter-selector";
import { CricketTeamFilterPills } from "@/components/cricket-teams/cricket-team-filter-pills";
import { CricketTeamDownloadButton } from "@/components/cricket-teams/cricket-team-download-button";

export const Route = createFileRoute("/cricket-teams/$teamId")({
  component: CricketTeamComponent,
  head: ({ params }) => {
    const team = CRICKET_NATIONAL_TEAMS.find(t => t.id === params.teamId);
    return {
      meta: [
        {
          title: team
            ? `${team.name} Cricket Schedule — every series in one place`
            : "Cricket Team Schedule",
        },
      ],
    };
  },
});

function CricketTeamComponent() {
  const { teamId } = Route.useParams();
  const team = CRICKET_NATIONAL_TEAMS.find(t => t.id === teamId);

  const [filters, setFilters] = useState<CricketTeamFilters>({
    showPastEvents: false,
    formats: [],
  });

  const {
    data: events,
    isPending,
    error,
  } = useQuery({
    queryKey: ["cricket-team", teamId, "events"],
    queryFn: () => fetchAllCricketTeamEvents(teamId),
    enabled: Boolean(team),
  });

  if (!team) {
    return (
      <div className="max-w-3xl mx-auto text-center grid gap-4 py-12">
        <p className="text-lg font-medium">Team not found</p>
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="underline">
            Back to the team selector
          </Link>
        </p>
      </div>
    );
  }

  const filteredEvents = filterCricketTeamEvents(events ?? [], filters);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {team.name} Schedule
        </h1>
        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
          <CricketTeamDownloadButton
            team={team}
            events={filteredEvents}
            filters={filters}
          />
          <SaveLeagueButton
            league="cricket-team"
            subscriptionFilters={{ teamId: team.id, formats: filters.formats }}
          />
          <CricketTeamFilterSelector
            filters={filters}
            setFilters={setFilters}
          />
        </div>
      </div>

      <CricketTeamFilterPills filters={filters} setFilters={setFilters} />

      <div className="flex flex-wrap gap-4">
        {isPending && (
          <div className="grid gap-4 w-full" aria-label="Loading schedule">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-40 w-full animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t load the schedule. Please try again later.
          </p>
        )}

        {!isPending && !error && filteredEvents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No matches for the selected filters.
          </p>
        )}

        <div className="grid gap-4 w-full">
          {filteredEvents.map(event => (
            <CricketTeamEventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}
