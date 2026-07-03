import { useState } from "react";
import { CalendarCheck, CalendarHeart, Check } from "lucide-react";
import type { League, SubscriptionFilters } from "@/api/calendar/types";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useMyCalendar, useUpsertSubscription } from "@/hooks/useMyCalendar";

type SaveLeagueButtonProps = {
  league: League;
  /** The league page's current filters in the stored subscription shape. */
  subscriptionFilters: SubscriptionFilters;
};

/**
 * Saves the league (with the currently selected filters) to the signed-in
 * user's personal calendar; saving again replaces the stored filters. Signed
 * out it prompts sign-in; renders nothing when accounts aren't configured.
 */
function SaveLeagueButton({
  league,
  subscriptionFilters,
}: SaveLeagueButtonProps) {
  const { enabled, user } = useAuth();
  const { data: calendar } = useMyCalendar();
  const upsertSubscription = useUpsertSubscription();
  const [justSaved, setJustSaved] = useState(false);

  if (!enabled) return null;

  if (!user) {
    return (
      <SignInDialog
        description="Sign in to combine your favorite leagues into one personal calendar feed."
        trigger={
          <Button variant="outline" size="lg">
            <CalendarHeart className="size-4" aria-hidden />
            Save to My Calendar
          </Button>
        }
      />
    );
  }

  const isSubscribed =
    calendar?.subscriptions.some(s => s.league === league) ?? false;

  const handleSave = () => {
    upsertSubscription.mutate(
      { league, filters: subscriptionFilters },
      {
        onSuccess: () => {
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 2000);
        },
      }
    );
  };

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleSave}
      disabled={upsertSubscription.isPending}
    >
      {justSaved ? (
        <>
          <Check className="size-4" aria-hidden />
          Saved!
        </>
      ) : isSubscribed ? (
        <>
          <CalendarCheck className="size-4" aria-hidden />
          Update My Calendar
        </>
      ) : (
        <>
          <CalendarHeart className="size-4" aria-hidden />
          Save to My Calendar
        </>
      )}
    </Button>
  );
}

export default SaveLeagueButton;
