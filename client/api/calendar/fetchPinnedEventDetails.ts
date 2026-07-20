import type { QueryClient } from "@tanstack/react-query";
import {
  fetchAllIplEvents,
  fetchEventDetails,
  fetchSeriesCalendar,
  fetchSeriesEventsByDate,
  mapWithConcurrency,
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
 * the query cache (shared across pins) and searched by id. Cricket pins store
 * `"{seriesId}:{eventId}"` and resolve from that one series' match days,
 * cached per series (shared across pins in the same series). Returns null
 * when the event no longer exists upstream.
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

  if (pin.league === "cricket-team") {
    const [seriesId, eventId] = pin.espnEventId.split(":");
    if (!seriesId || !eventId) return null;
    const events = await queryClient.ensureQueryData({
      queryKey: ["cricket-team", "series-events", seriesId],
      queryFn: async () => {
        const days = await fetchSeriesCalendar(seriesId);
        const byDay = await mapWithConcurrency(days, 8, day =>
          fetchSeriesEventsByDate({ id: seriesId, name: "" }, day)
        );
        return byDay.flat();
      },
    });
    const event = events.find(e => e.id === eventId);
    return event ? { name: event.name, date: event.date } : null;
  }

  const event = await fetchEventDetails<BaseEvent>(
    `https://sports.core.api.espn.com/v2/sports/${CORE_PATHS[pin.league]}/events/${pin.espnEventId}`
  );
  return event?.name ? { name: event.name, date: event.date } : null;
}
