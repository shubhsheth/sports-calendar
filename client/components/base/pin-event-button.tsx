import { Pin } from "lucide-react";
import type { League } from "@/api/calendar/types";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useMyCalendar,
  usePinEvent,
  useUnpinEvent,
} from "@/hooks/useMyCalendar";
import { analytics } from "@/lib/analytics";

type PinEventButtonProps = {
  league: League;
  espnEventId: string;
};

/**
 * Pin/unpin a single fixture on the signed-in user's personal calendar.
 * Signed out it prompts sign-in; renders nothing when accounts aren't
 * configured.
 */
function PinEventButton({ league, espnEventId }: PinEventButtonProps) {
  const { enabled, user } = useAuth();
  const { data: calendar } = useMyCalendar();
  const pinEvent = usePinEvent();
  const unpinEvent = useUnpinEvent();

  if (!enabled) return null;

  if (!user) {
    return (
      <SignInDialog
        description="Sign in to pin individual games to your personal calendar feed."
        trigger={
          <Button variant="ghost" size="icon" aria-label="Pin to My Calendar">
            <Pin className="size-4" aria-hidden />
          </Button>
        }
      />
    );
  }

  const isPinned =
    calendar?.pinnedEvents.some(
      p => p.league === league && p.espnEventId === espnEventId
    ) ?? false;

  const toggle = () => {
    const args = { league, espnEventId };
    if (isPinned) {
      unpinEvent.mutate(args, {
        onSuccess: () => analytics.eventUnpinned(league, espnEventId),
      });
    } else {
      pinEvent.mutate(args, {
        onSuccess: () => analytics.eventPinned(league, espnEventId),
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isPinned ? "Unpin from My Calendar" : "Pin to My Calendar"}
      aria-pressed={isPinned}
      disabled={pinEvent.isPending || unpinEvent.isPending}
      onClick={toggle}
    >
      <Pin
        className={`size-4 ${isPinned ? "fill-current text-primary" : ""}`}
        aria-hidden
      />
    </Button>
  );
}

export default PinEventButton;
