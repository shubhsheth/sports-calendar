import type { NbaEvent, NbaEventFilters, NbaTeam } from "@/types/nba";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import dayjs from "dayjs";
import type { EventRef } from "@/types/base";
import { useQuery } from "@tanstack/react-query";
import { fetchEventDetails } from "@/api/espn/fetchEventDetails";
import { filterNbaEvent } from "./utils/filterNbaEvents";
import { fetchTeamDetails } from "@/api/espn/fetchTeamDetails";

type NbaEventCardProps = {
  eventRef: EventRef;
  filters: NbaEventFilters;
};

function NbaEventCard({ eventRef, filters }: NbaEventCardProps) {
  const {
    data: nbaEvent,
    isPending,
    error,
  } = useQuery({
    queryKey: ["nba-event", eventRef],
    queryFn: () => fetchEventDetails<NbaEvent>(eventRef.$ref),
  });

  if (isPending) return null;
  if (!nbaEvent) return <div>Error looking for event</div>;
  if (error) return <div>Error: {error.message}</div>;

  const filteredNbaEvent = filterNbaEvent(nbaEvent, filters);
  if (!filteredNbaEvent) return null;

  const mainCompetition = filteredNbaEvent.competitions[0];
  const homeCompetitor = mainCompetition.competitors.find(
    (c) => c.homeAway === "home",
  );
  const awayCompetitor = mainCompetition.competitors.find(
    (c) => c.homeAway === "away",
  );

  const eventDate = dayjs(mainCompetition.date).format("MMM D, h:mm A");

  return (
    <Card className="w-full">
      <CardContent className="pt-1">
        <div className="grid grid-cols-3 gap-4 justify-between">
          {awayCompetitor?.team?.$ref && (
            <TeamLogo teamRef={awayCompetitor.team.$ref} />
          )}
          <div className="grid justify-center content-end pb-3 italic text-muted-foreground text-sm">
            at
          </div>
          {homeCompetitor?.team?.$ref && (
            <TeamLogo teamRef={homeCompetitor.team.$ref} />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start border-t bg-muted/30 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{eventDate}</span>
          <span> - </span>
          {mainCompetition.venue.fullName}
        </p>
      </CardFooter>
    </Card>
  );
}

function TeamLogo({ teamRef }: { teamRef: string }) {
  const { data: team, isLoading } = useQuery({
    queryKey: ["nba", "team", teamRef],
    queryFn: () => fetchTeamDetails<NbaTeam>(teamRef),
  });

  if (isLoading) return <div className="h-10 w-10 animate-pulse bg-muted" />;
  if (!team) return null;

  const defaultLogo = team?.logos?.find((logo) => logo.rel.includes("default"));
  if (!defaultLogo) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={defaultLogo.href}
        alt={team?.name ?? "Team Logo"}
        className="h-10 w-10 object-contain"
        loading="lazy"
      />
      <div className="text-base font-semibold text-center">
        {team.displayName}
      </div>
    </div>
  );
}

export default NbaEventCard;
