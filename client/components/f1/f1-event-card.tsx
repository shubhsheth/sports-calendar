import PinEventButton from "@/components/base/pin-event-button";
import {
  type F1Event,
  type F1EventFilters,
  type EventRef,
  fetchEventDetails,
  filterF1Event,
  isEventLive,
  translateF1EventTypeAbbr,
  cleanUpF1SponsorNames,
  F1_SESSION_DURATIONS,
} from "@sports-calendar/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";

import { LiveBadge } from "@/components/ui/live-badge";

type F1EventCardProps = {
  league: string;
  eventRef?: EventRef;
  /** Pre-fetched event (home merged schedule); skips the ref fetch. */
  event?: F1Event;
  filters: F1EventFilters;
};

function F1EventCard({ league, eventRef, event, filters }: F1EventCardProps) {
  const {
    data: fetchedEvent,
    isPending,
    error,
  } = useQuery({
    queryKey: [league, "event", eventRef?.$ref],
    queryFn: () => {
      if (!eventRef) throw new Error("eventRef is required without event");
      return fetchEventDetails<F1Event>(eventRef.$ref);
    },
    enabled: !event,
  });

  const f1Event = event ?? fetchedEvent;
  if (!event && isPending)
    return <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />;
  if (!f1Event || error) return null;

  const filteredF1Event = filterF1Event(f1Event, filters);
  if (!filteredF1Event) return null;

  return (
    <Card className="w-full overflow-hidden border-l-4 border-l-red-600 transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            {cleanUpF1SponsorNames(filteredF1Event.name)}
          </h3>
          <PinEventButton league="f1" espnEventId={filteredF1Event.id} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-1">
          {filteredF1Event.competitions.map(competition => {
            const isRace = competition.type.abbreviation === "Race";
            const durationMin = F1_SESSION_DURATIONS[competition.type.id] ?? 60;
            const isLive = isEventLive(competition.date, durationMin);
            return (
              <div
                key={competition.id}
                className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                  isRace ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Calendar Widget Look */}
                  <div className="flex flex-col items-center justify-center min-w-[3rem] border-r pr-4">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      {dayjs(competition.date).format("MMM")}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {dayjs(competition.date).format("DD")}
                    </span>
                  </div>

                  {/* Session Info */}
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-bold ${isRace ? "text-red-600" : "text-foreground"}`}
                    >
                      {translateF1EventTypeAbbr(competition.type.abbreviation)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isRace ? "Main Event" : "Session"}
                    </span>
                  </div>
                </div>

                {/* Time / Live */}
                <div className="flex flex-col items-end gap-1">
                  {isLive && <LiveBadge />}
                  <span className="font-mono font-medium">
                    {dayjs(competition.date).format("HH:mm")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default F1EventCard;
