import type {
  NflEvent,
  NflEventFilters,
  NflTeam,
  EventRef,
} from "@sports-calendar/shared";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import dayjs from "dayjs";

import { useQuery } from "@tanstack/react-query";
import { fetchEventDetails } from "@/api/espn/fetchEventDetails";
import { filterNflEvent } from "./utils/filterNflEvents";
import { fetchTeamDetails } from "@/api/espn/fetchTeamDetails";
import { LiveBadge } from "@/components/ui/live-badge";
import { isEventLive } from "@/lib/eventStatus";
import { NFL_DURATION_MINUTES } from "./utils/nflEventDuration";

type NflEventCardProps = {
  league: string;
  eventRef: EventRef;
  filters: NflEventFilters;
};

function NflEventCard({ eventRef, filters }: NflEventCardProps) {
  const {
    data: nflEvent,
    isPending,
    error,
  } = useQuery({
    queryKey: ["nfl-event", eventRef],
    queryFn: () => fetchEventDetails<NflEvent>(eventRef.$ref),
  });

  if (isPending) return null;
  if (!nflEvent) return <div>Error looking for event</div>;
  if (error) return <div>Error: {error.message}</div>;

  const filteredNflEvent = filterNflEvent(nflEvent, filters);
  if (!filteredNflEvent) return null;

  const mainCompetition = filteredNflEvent.competitions[0];
  const homeCompetitor = mainCompetition.competitors.find(
    c => c.homeAway === "home"
  );
  const awayCompetitor = mainCompetition.competitors.find(
    c => c.homeAway === "away"
  );

  const eventDate = dayjs(mainCompetition.date).format("MMM D, h:mm A");
  const isLive = isEventLive(mainCompetition.date, NFL_DURATION_MINUTES);

  return (
    <Card className="w-full">
      <CardContent className="pt-1">
        <div className="grid grid-cols-3 gap-4">
          {awayCompetitor?.team?.$ref ? (
            <TeamLogo teamRef={awayCompetitor.team.$ref} />
          ) : (
            <TbdTeam />
          )}
          <div className="flex flex-col items-center justify-between py-3">
            {isLive ? <LiveBadge /> : <span />}
            <span className="italic text-muted-foreground text-sm">at</span>
          </div>
          {homeCompetitor?.team?.$ref ? (
            <TeamLogo teamRef={homeCompetitor.team.$ref} />
          ) : (
            <TbdTeam />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start border-t bg-muted/30 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{eventDate}</span>
          {mainCompetition.venue && (
            <>
              <span> - </span>
              {mainCompetition.venue.fullName}
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}

function TeamLogo({ teamRef }: { teamRef: string }) {
  const { data: team, isLoading } = useQuery({
    queryKey: ["nfl", "team", teamRef],
    queryFn: () => fetchTeamDetails<NflTeam>(teamRef),
  });

  if (isLoading) return <div className="h-10 w-10 animate-pulse bg-muted" />;
  if (!team) return <TbdTeam />;

  const defaultLogo = team?.logos?.find(logo => logo.rel.includes("default"));
  if (!defaultLogo) return <TbdTeam />;

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

function TbdTeam() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 bg-muted rounded" />
      <div className="text-base font-semibold text-center text-muted-foreground">
        TBD
      </div>
    </div>
  );
}

export default NflEventCard;
