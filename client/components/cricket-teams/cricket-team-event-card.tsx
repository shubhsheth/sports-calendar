import type { CricketTeamEvent } from "@sports-calendar/shared";
import { isCricketEventPast } from "@sports-calendar/shared";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import { LiveBadge } from "@/components/ui/live-badge";
import PinEventButton from "@/components/base/pin-event-button";

type CricketTeamEventCardProps = {
  event: CricketTeamEvent;
};

/**
 * One match on a team's schedule page. Mirrors the IPL card, plus the two
 * things a cross-series list needs for context: the series name and a format
 * badge ("2nd T20I"). Filtering happens upstream in the route (via
 * `filterCricketTeamEvents`), so this card is purely presentational.
 */
function CricketTeamEventCard({ event }: CricketTeamEventCardProps) {
  const homeCompetitor = event.competitors.find(c => c.homeAway === "home");
  const awayCompetitor = event.competitors.find(c => c.homeAway === "away");

  const eventDate = dayjs(event.date).format("MMM D, h:mm A");
  // Live = started but not yet past; the past check is endDate-aware, so a
  // Test stays live across all its days.
  const isLive =
    dayjs().isAfter(dayjs(event.date)) && !isCricketEventPast(event);
  const formatLabel = event.formatDetail || event.format.toUpperCase();

  return (
    <Card className="w-full">
      <CardContent className="pt-1">
        <div className="flex items-center justify-between gap-2 pb-2">
          <span className="text-xs text-muted-foreground truncate">
            {event.seriesName}
          </span>
          <Badge variant="secondary" className="shrink-0">
            {formatLabel}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {awayCompetitor ? (
            <TeamDisplay competitor={awayCompetitor} />
          ) : (
            <TbdTeam />
          )}
          <div className="flex flex-col items-center justify-between py-3">
            {isLive ? <LiveBadge /> : <span />}
            <span className="italic text-muted-foreground text-sm">v</span>
          </div>
          {homeCompetitor ? (
            <TeamDisplay competitor={homeCompetitor} />
          ) : (
            <TbdTeam />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 border-t bg-muted/30 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{eventDate}</span>
          {event.venue && (
            <>
              <span> - </span>
              {event.venue.fullName}
            </>
          )}
        </p>
        {/* Composite id: the personal feed resolves pins from the series'
            calendar, which needs the series id alongside the event id. */}
        <PinEventButton
          league="cricket-team"
          espnEventId={`${event.seriesId}:${event.id}`}
        />
      </CardFooter>
    </Card>
  );
}

function TeamDisplay({
  competitor,
}: {
  competitor: CricketTeamEvent["competitors"][number];
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={competitor.logo}
        alt={competitor.displayName}
        className="h-10 w-10 object-contain"
        loading="lazy"
      />
      <div className="text-base font-semibold text-center">
        {competitor.displayName}
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

export default CricketTeamEventCard;
