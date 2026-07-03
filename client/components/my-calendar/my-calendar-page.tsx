import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Trash2 } from "lucide-react";
import { translateF1EventTypeId } from "@sports-calendar/shared";
import type { CalendarSubscription } from "@/api/calendar/types";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import AddToCalendarFeedLinks from "@/components/base/add-to-calendar-feed-links";
import { LEAGUE_LABELS } from "@/components/my-calendar/league-labels";
import { PinnedEventItem } from "@/components/my-calendar/pinned-event-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useMyCalendar,
  useRegenerateFeedToken,
  useRemoveSubscription,
} from "@/hooks/useMyCalendar";
import { analytics } from "@/lib/analytics";
import { buildMyCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

export function MyCalendarPage() {
  const { enabled, loading, user } = useAuth();

  if (!enabled) {
    return (
      <PageShell>
        <p className="text-muted-foreground">
          Accounts aren&apos;t configured for this deployment.
        </p>
      </PageShell>
    );
  }

  if (loading) return null;

  if (!user) {
    return (
      <PageShell>
        <p className="text-muted-foreground">
          Sign in to combine your favorite leagues and games into one calendar
          feed.
        </p>
        <SignInDialog
          trigger={<Button className="self-start">Sign in</Button>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <CalendarContent />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <h1 className="text-4xl font-extrabold tracking-tight">My Calendar</h1>
      {children}
    </div>
  );
}

function CalendarContent() {
  const { data: calendar, isPending, error } = useMyCalendar();

  if (isPending) {
    return <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />;
  }
  if (error) return <p className="text-destructive">Error: {error.message}</p>;

  const isEmpty =
    !calendar ||
    (calendar.subscriptions.length === 0 && calendar.pinnedEvents.length === 0);

  if (isEmpty) {
    return (
      <p className="text-muted-foreground">
        Nothing here yet. Open a league page (for example{" "}
        <Link to="/nba" className="underline">
          NBA
        </Link>
        ) and use “Save to My Calendar” to add a filtered league, or pin
        individual games from their cards.
      </p>
    );
  }

  return (
    <>
      {calendar.subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leagues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {calendar.subscriptions.map(subscription => (
                <SubscriptionItem
                  key={subscription.league}
                  subscription={subscription}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {calendar.pinnedEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pinned games</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {calendar.pinnedEvents.map(pin => (
                <PinnedEventItem
                  key={`${pin.league}-${pin.espnEventId}`}
                  pin={pin}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <FeedCard feedToken={calendar.feedToken} />
    </>
  );
}

/** Human summary of a subscription's stored filters. */
function describeFilters(subscription: CalendarSubscription): string {
  const { league, filters } = subscription;
  if (league === "f1") {
    const types = filters.types ?? [];
    if (types.length === 0) return "All sessions";
    return types.map(translateF1EventTypeId).join(", ");
  }
  const teamIds = filters.teamIds ?? [];
  if (teamIds.length === 0) return "All teams";
  return `${teamIds.length} team${teamIds.length === 1 ? "" : "s"} selected`;
}

function SubscriptionItem({
  subscription,
}: {
  subscription: CalendarSubscription;
}) {
  const removeSubscription = useRemoveSubscription();

  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="secondary" className="uppercase shrink-0">
          {LEAGUE_LABELS[subscription.league]}
        </Badge>
        <span className="text-sm text-muted-foreground truncate">
          {describeFilters(subscription)}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${LEAGUE_LABELS[subscription.league]} subscription`}
        disabled={removeSubscription.isPending}
        onClick={() =>
          removeSubscription.mutate(
            { league: subscription.league },
            {
              onSuccess: () =>
                analytics.leagueRemovedFromMyCalendar(subscription.league),
            }
          )
        }
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  );
}

function FeedCard({ feedToken }: { feedToken: string }) {
  const regenerate = useRegenerateFeedToken();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const feedUrl = buildMyCalendarFeedUrl(feedToken);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your calendar feed</CardTitle>
      </CardHeader>
      <AddToCalendarFeedLinks league="my-calendar" feedUrl={feedUrl} />
      <CardContent className="pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <RefreshCw className="size-4" aria-hidden />
          Regenerate URL
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Regenerate feed URL?</DialogTitle>
              <DialogDescription>
                Your current feed URL stops working immediately. Calendars
                subscribed to it will need the new link.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={regenerate.isPending}
                onClick={() =>
                  regenerate.mutate(undefined, {
                    onSuccess: () => {
                      analytics.feedTokenRegenerated();
                      setConfirmOpen(false);
                    },
                  })
                }
              >
                Regenerate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
