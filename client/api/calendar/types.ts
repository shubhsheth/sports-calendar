/** Leagues a personal calendar can reference (mirrors the DB check constraint). */
export type League = "nba" | "nfl" | "f1" | "ipl" | "fifa" | "cricket-team";

/**
 * Stored filter shape for a subscription — mirrors the feed query params
 * (`teamIds` for team leagues, `types` for F1, `formats` for cricket teams)
 * that the backend validates with `parse<League>Params`. `cricket-team` rows
 * additionally store `teamId`, which identifies the followed team (several
 * cricket-team rows may coexist, one per team).
 */
export type SubscriptionFilters = {
  teamIds?: string[];
  types?: string[];
  teamId?: string;
  formats?: string[];
};

export type CalendarSubscription = {
  league: League;
  filters: SubscriptionFilters;
};

export type PinnedEvent = {
  league: League;
  espnEventId: string;
};

export type MyCalendar = {
  id: string;
  feedToken: string;
  subscriptions: CalendarSubscription[];
  pinnedEvents: PinnedEvent[];
};
