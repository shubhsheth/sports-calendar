import type { QueryClient } from "@tanstack/react-query";
import {
  fetchAllIplEvents,
  fetchEventDetails,
  type BaseEvent,
} from "@sports-calendar/shared";
import type { PinnedEvent } from "./types";

export type PinnedEventDetails = {
  name: string;
  date: string;
};

/** Core API path per league; IPL is Site-API only and handled separately. */
const CORE_PATHS = {
  nba: "basketball/leagues/nba",
  nfl: "football/leagues/nfl",
  f1: "racing/leagues/f1",
  fifa: "soccer/leagues/fifa.world",
} as const;

/**
 * Name/date for a pinned event. Core-API leagues fetch the single event by
 * id; IPL has no per-event endpoint, so the season is fetched once through
 * the query cache (shared across pins) and searched by id. Returns null when
 * the event no longer exists upstream.
 */
export async function fetchPinnedEventDetails(
  pin: PinnedEvent,
  queryClient: QueryClient
): Promise<PinnedEventDetails | null> {
  if (pin.league === "ipl") {
    const events = await queryClient.ensureQueryData({
      queryKey: ["ipl", "season", "all-events"],
      queryFn: fetchAllIplEvents,
    });
    const event = events.find(e => e.id === pin.espnEventId);
    return event ? { name: event.name, date: event.date } : null;
  }

  const event = await fetchEventDetails<BaseEvent>(
    `https://sports.core.api.espn.com/v2/sports/${CORE_PATHS[pin.league]}/events/${pin.espnEventId}`
  );
  return event?.name ? { name: event.name, date: event.date } : null;
}
