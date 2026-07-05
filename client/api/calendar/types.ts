/** Leagues a personal calendar can reference (mirrors the DB check constraint). */
export type League = "nba" | "nfl" | "f1" | "ipl" | "fifa";

/**
 * Stored filter shape for a league subscription — mirrors the feed query
 * params (`teamIds` for team leagues, `types` for F1) that the backend
 * validates with `parse<League>Params`.
 */
export type SubscriptionFilters = {
  teamIds?: string[];
  types?: string[];
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
