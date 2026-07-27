import type { EventAttributes } from "ics";
import {
  type CricketTeamEvent,
  fetchAllCricketTeamEvents,
  fetchSeriesCalendar,
  fetchSeriesEventsByDate,
  filterCricketTeamEvents,
  mapWithConcurrency,
  transformCricketTeamEventsToIcs,
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
  parseCricketTeamParams,
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

const CRICKET_PIN_CONCURRENCY = 8;

/**
 * Cricket-team slice of the personal feed. Unlike the leagues, several
 * `cricket-team` subscriptions may exist (one per followed team), each
 * fetched via its own discovery scan; pinned matches store
 * `"{seriesId}:{eventId}"` so they resolve from that one series' calendar
 * without any discovery. Invalid subscriptions and unresolvable pins are
 * skipped rather than failing the feed.
 */
async function buildCricketTeamIcsEvents(
  calendar: PersonalCalendarData
): Promise<EventAttributes[]> {
  const subscriptions = calendar.subscriptions.filter(
    s => s.league === "cricket-team"
  );
  const pins = calendar.pinnedEvents.filter(p => p.league === "cricket-team");

  const perTeam = await Promise.all(
    subscriptions.map(async subscription => {
      const teamId =
        typeof subscription.filters?.teamId === "string"
          ? subscription.filters.teamId
          : "";
      const query: Record<string, string> = {};
      if (Array.isArray(subscription.filters?.formats)) {
        query.formats = subscription.filters.formats.join(",");
      }
      const parsed = parseCricketTeamParams(teamId, query);
      if (!parsed.ok) {
        console.error(`Skipping cricket-team subscription: ${parsed.error}`);
        return [];
      }
      const events = await fetchAllCricketTeamEvents(teamId);
      return filterCricketTeamEvents(events, parsed.value);
    })
  );

  const perPin = await Promise.all(
    pins.map(async pin => {
      const [seriesId, eventId] = pin.espnEventId.split(":");
      if (!seriesId || !eventId) return [];
      try {
        const days = await fetchSeriesCalendar(seriesId);
        const byDay = await mapWithConcurrency(
          days,
          CRICKET_PIN_CONCURRENCY,
          day => fetchSeriesEventsByDate({ id: seriesId, name: "" }, day)
        );
        const match = byDay.flat().find(event => event.id === eventId);
        return match ? [match] : [];
      } catch (error) {
        console.error(`Skipping cricket pin ${pin.espnEventId}:`, error);
        return [];
      }
    })
  );

  // A pinned match that also falls under a subscription appears once.
  const selected = new Map<string, CricketTeamEvent>();
  for (const event of [...perTeam.flat(), ...perPin.flat()]) {
    if (!selected.has(event.id)) selected.set(event.id, event);
  }
  return transformCricketTeamEventsToIcs([...selected.values()]);
}

/**
 * Combined feed pipeline: for each league the calendar references, fetch the
 * season once, take the union of the subscription's filtered events and the
 * pinned events (by event id), transform to ICS, then dedupe by UID.
 * Cricket-team subscriptions/pins contribute via their own pipeline (several
 * teams may be followed at once). A subscription whose stored filters fail
 * validation is skipped rather than failing the whole feed.
 */
export async function buildCombinedIcsEvents(
  calendar: PersonalCalendarData
): Promise<EventAttributes[]> {
  const involved = LEAGUES.filter(
    league =>
      calendar.subscriptions.some(s => s.league === league) ||
      calendar.pinnedEvents.some(p => p.league === league)
  );

  // Cricket and the leagues run concurrently, awaited together so that a
  // rejection from either always has a handler attached — an unhandled one
  // takes down the isolate instead of returning a 500.
  const [cricketIcsEvents, perLeague] = await Promise.all([
    buildCricketTeamIcsEvents(calendar),
    Promise.all(
      involved.map(async league => {
        const pipe = PIPELINES[league];

        // Validate stored filters before fetching, so a league referenced only
        // by an invalid subscription costs no ESPN round trip.
        const subscription = calendar.subscriptions.find(
          s => s.league === league
        );
        let filters: unknown = null;
        if (subscription) {
          const parsed = pipe.parseFilters(
            filtersToQuery(subscription.filters)
          );
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
    ),
  ]);

  const seenUids = new Set<string>();
  const combined: EventAttributes[] = [];
  for (const icsEvent of [...perLeague.flat(), ...cricketIcsEvents]) {
    const uid = icsEvent.uid;
    if (uid) {
      if (seenUids.has(uid)) continue;
      seenUids.add(uid);
    }
    combined.push(icsEvent);
  }
  return combined;
}
