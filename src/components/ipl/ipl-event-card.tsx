import type { IplEvent, IplEventFilters } from "@/types/ipl";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import dayjs from "dayjs";
import { filterIplEvent } from "./utils/filterIplEvents";
import { LiveBadge } from "@/components/ui/live-badge";

type IplEventCardProps = {
  event: IplEvent;
  filters: IplEventFilters;
};

function IplEventCard({ event, filters }: IplEventCardProps) {
  const filtered = filterIplEvent(event, filters);
  if (!filtered) return null;

  const homeCompetitor = filtered.competitors.find(c => c.homeAway === "home");
  const awayCompetitor = filtered.competitors.find(c => c.homeAway === "away");

  const eventDate = dayjs(filtered.date).format("MMM D, h:mm A");
  const isLive =
    dayjs().isAfter(dayjs(filtered.date)) &&
    dayjs().isBefore(dayjs(filtered.date).add(240, "minutes"));

  return (
    <Card className="w-full">
      <CardContent className="pt-1">
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
      <CardFooter className="flex flex-col items-start border-t bg-muted/30 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{eventDate}</span>
          {filtered.venue && (
            <>
              <span> - </span>
              {filtered.venue.fullName}
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}

function TeamDisplay({
  competitor,
}: {
  competitor: IplEventCardProps["event"]["competitors"][number];
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

export default IplEventCard;
