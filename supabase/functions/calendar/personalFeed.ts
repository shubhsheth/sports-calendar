import type { EventAttributes } from "ics";
import {
  fetchAllNbaEvents,
  filterNbaEvents,
  transformNbaEventsToIcs,
  fetchAllNflEvents,
  filterNflEvents,
  transformNflEventsToIcs,
  fetchAllF1Events,
  filterF1Events,
  transformF1EventsToIcs,
  fetchAllIplEvents,
  filterIplEvents,
  transformIplEventsToIcs,
  fetchAllFifaEvents,
  filterFifaEvents,
  transformFifaEventsToIcs,
} from "@sports-calendar/shared";
import {
  parseNbaParams,
  parseNflParams,
  parseF1Params,
  parseIplParams,
  parseFifaParams,
  type ParseResult,
} from "../_shared/params.ts";
import type {
  PersonalCalendarData,
  StoredFilters,
} from "../_shared/personalCalendar.ts";

const LEAGUES = ["nba", "nfl", "f1", "ipl", "fifa"] as const;
type League = (typeof LEAGUES)[number];

type AnyEvent = { id: string };

type LeaguePipeline = {
  parseFilters: (query: Record<string, string>) => ParseResult<unknown>;
  fetchEvents: () => Promise<AnyEvent[]>;
  filterEvents: (events: AnyEvent[], filters: unknown) => AnyEvent[];
  transformToIcs: (events: AnyEvent[]) => EventAttributes[];
};

/** Erase one league's concrete event/filter types in a single place. */
function pipeline<TEvent extends AnyEvent, TFilters>(
  parseFilters: (query: Record<string, string>) => ParseResult<TFilters>,
  fetchEvents: () => Promise<TEvent[]>,
  filterEvents: (events: TEvent[], filters: TFilters) => TEvent[],
  transformToIcs: (events: TEvent[]) => EventAttributes[]
): LeaguePipeline {
  return {
    parseFilters,
    fetchEvents,
    filterEvents: (events, filters) =>
      filterEvents(events as TEvent[], filters as TFilters),
    transformToIcs: events => transformToIcs(events as TEvent[]),
  };
}

/** The same four functions the per-league routes wire up, keyed by league. */
const PIPELINES: Record<League, LeaguePipeline> = {
  nba: pipeline(
    parseNbaParams,
    fetchAllNbaEvents,
    filterNbaEvents,
    transformNbaEventsToIcs
  ),
  nfl: pipeline(
    parseNflParams,
    fetchAllNflEvents,
    filterNflEvents,
    transformNflEventsToIcs
  ),
  f1: pipeline(
    parseF1Params,
    fetchAllF1Events,
    filterF1Events,
    transformF1EventsToIcs
  ),
  ipl: pipeline(
    parseIplParams,
    fetchAllIplEvents,
    filterIplEvents,
    transformIplEventsToIcs
  ),
  fifa: pipeline(
    parseFifaParams,
    fetchAllFifaEvents,
    filterFifaEvents,
    transformFifaEventsToIcs
  ),
};

/**
 * Stored JSONB filters → the query-param shape the existing per-league
 * parsers validate, so subscriptions go through the exact same validation
 * as the public feed routes.
 */
function filtersToQuery(filters: StoredFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (Array.isArray(filters?.teamIds)) query.teamIds = filters.teamIds.join(",");
  if (Array.isArray(filters?.types)) query.types = filters.types.join(",");
  return query;
}

/**
 * Combined feed pipeline: for each league the calendar references, fetch the
 * season once, take the union of the subscription's filtered events and the
 * pinned events (by event id), transform to ICS, then dedupe by UID.
 * A subscription whose stored filters fail validation is skipped rather than
 * failing the whole feed.
 */
export async function buildCombinedIcsEvents(
  calendar: PersonalCalendarData
): Promise<EventAttributes[]> {
  const involved = LEAGUES.filter(
    league =>
      calendar.subscriptions.some(s => s.league === league) ||
      calendar.pinnedEvents.some(p => p.league === league)
  );

  const perLeague = await Promise.all(
    involved.map(async league => {
      const pipe = PIPELINES[league];

      // Validate stored filters before fetching, so a league referenced only
      // by an invalid subscription costs no ESPN round trip.
      const subscription = calendar.subscriptions.find(
        s => s.league === league
      );
      let filters: unknown = null;
      if (subscription) {
        const parsed = pipe.parseFilters(filtersToQuery(subscription.filters));
        if (parsed.ok) {
          filters = parsed.value;
        } else {
          console.error(`Skipping ${league} subscription: ${parsed.error}`);
        }
      }
      const pinnedIds = new Set(
        calendar.pinnedEvents
          .filter(p => p.league === league)
          .map(p => p.espnEventId)
      );
      if (filters === null && pinnedIds.size === 0) return [];

      const events = await pipe.fetchEvents();
      const selected = new Map<string, AnyEvent>();
      if (filters !== null) {
        for (const event of pipe.filterEvents(events, filters)) {
          selected.set(event.id, event);
        }
      }
      for (const event of events) {
        if (pinnedIds.has(event.id)) selected.set(event.id, event);
      }

      return pipe.transformToIcs([...selected.values()]);
    })
  );

  const seenUids = new Set<string>();
  const combined: EventAttributes[] = [];
  for (const icsEvent of perLeague.flat()) {
    const uid = icsEvent.uid;
    if (uid) {
      if (seenUids.has(uid)) continue;
      seenUids.add(uid);
    }
    combined.push(icsEvent);
  }
  return combined;
}
