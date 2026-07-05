import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Trash2 } from "lucide-react";
import { fetchPinnedEventDetails } from "@/api/calendar/fetchPinnedEventDetails";
import type { PinnedEvent } from "@/api/calendar/types";
import { LEAGUE_LABELS } from "@/components/my-calendar/league-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnpinEvent } from "@/hooks/useMyCalendar";
import { analytics } from "@/lib/analytics";

/** One pinned fixture: league badge, name/date from ESPN, and unpin. */
export function PinnedEventItem({ pin }: { pin: PinnedEvent }) {
  const queryClient = useQueryClient();
  const unpinEvent = useUnpinEvent();
  const { data: details, isPending } = useQuery({
    queryKey: ["pinned-event-details", pin.league, pin.espnEventId],
    queryFn: () => fetchPinnedEventDetails(pin, queryClient),
  });

  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="secondary" className="uppercase shrink-0">
          {LEAGUE_LABELS[pin.league]}
        </Badge>
        <div className="min-w-0">
          {isPending ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : details ? (
            <>
              <p className="text-sm font-medium truncate">{details.name}</p>
              <p className="text-xs text-muted-foreground">
                {dayjs(details.date).format("MMM D, YYYY h:mm A")}
              </p>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Event #{pin.espnEventId} (no longer listed)
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove pinned event ${details?.name ?? pin.espnEventId}`}
        disabled={unpinEvent.isPending}
        onClick={() =>
          unpinEvent.mutate(
            { league: pin.league, espnEventId: pin.espnEventId },
            {
              onSuccess: () =>
                analytics.eventUnpinned(pin.league, pin.espnEventId),
            }
          )
        }
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  );
}
