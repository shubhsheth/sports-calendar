import type { F1Event, F1EventFilters } from "@/types/f1";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import dayjs from "dayjs";
import { translateF1EventTypeAbbr } from "./utils/translateF1EventType";
import { cleanUpSponsorName } from "./utils/cleanUpSponsorName";
import { fetchEventDetails } from "@/api/espn/fetchEventDetails";
import { useQuery } from "@tanstack/react-query";
import type { EventRef } from "@/types/base";
import { filterF1Event } from "./utils/filterF1Events";

type F1EventCardProps = {
  baseQueryKey: string;
  eventRef: EventRef;
  filters: F1EventFilters;
};

function F1EventCard({ baseQueryKey, eventRef, filters }: F1EventCardProps) {
  const {
    data: f1Event,
    isPending,
    error,
  } = useQuery({
    queryKey: [baseQueryKey, "event", eventRef.$ref],
    queryFn: () => fetchEventDetails<F1Event>(eventRef.$ref),
  });

  if (isPending)
    return <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />;
  if (!f1Event || error) return null;

  const filteredF1Event = filterF1Event(f1Event, filters);
  if (!filteredF1Event) return null;

  return (
    <Card className="w-full overflow-hidden border-l-4 border-l-red-600 transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            {cleanUpSponsorName(filteredF1Event.name)}
          </h3>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-1">
          {filteredF1Event.competitions.map((competition) => {
            const isRace = competition.type.abbreviation === "Race";
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

                {/* Time */}
                <div className="text-right font-mono font-medium">
                  {dayjs(competition.date).format("HH:mm")}
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
