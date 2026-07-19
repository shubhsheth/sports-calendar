import { useQueries } from "@tanstack/react-query";
import type {
  CricketTeamEvent,
  F1Event,
  FifaEvent,
  IplEvent,
  NbaEvent,
  NflEvent,
} from "@sports-calendar/shared";
import {
  CRICKET_NATIONAL_TEAMS,
  fetchAllCricketTeamEvents,
  fetchAllF1Events,
  fetchAllFifaEvents,
  fetchAllIplEvents,
  fetchAllNbaEvents,
  fetchAllNflEvents,
  filterCricketTeamEvents,
  filterF1Events,
  filterFifaEvents,
  filterIplEvents,
  filterNbaEvents,
  filterNflEvents,
} from "@sports-calendar/shared";
import {
  HOME_LEAGUE_OPTIONS,
  type HomeLeague,
  type HomeSelection,
} from "./selectionState";

type LeagueEvent = NbaEvent | NflEvent | F1Event | IplEvent | FifaEvent;

/** One row of the merged schedule; `source` picks the card to render. */
export type CombinedEntry =
  | { source: "cricket-team"; event: CricketTeamEvent }
  | { source: "nba"; event: NbaEvent }
  | { source: "nfl"; event: NflEvent }
  | { source: "f1"; event: F1Event }
  | { source: "ipl"; event: IplEvent }
  | { source: "fifa"; event: FifaEvent };

const LEAGUE_FETCHERS: Record<HomeLeague, () => Promise<LeagueEvent[]>> = {
  nba: fetchAllNbaEvents,
  nfl: fetchAllNflEvents,
  f1: fetchAllF1Events,
  ipl: fetchAllIplEvents,
  fifa: fetchAllFifaEvents,
};

/**
 * Applies a league's own past-events filter and tags each event with its
 * source. The casts are sound: `events` always came from that same league's
 * fetcher (see `LEAGUE_FETCHERS`), the union type just can't carry that link.
 */
function filterLeagueEntries(
  league: HomeLeague,
  events: LeagueEvent[],
  showPastEvents: boolean
): CombinedEntry[] {
  switch (league) {
    case "nba":
      return filterNbaEvents(events as NbaEvent[], {
        showPastEvents,
        teamIds: [],
      }).map(event => ({ source: "nba", event }));
    case "nfl":
      return filterNflEvents(events as NflEvent[], {
        showPastEvents,
        teamIds: [],
      }).map(event => ({ source: "nfl", event }));
    case "f1":
      return filterF1Events(events as F1Event[], {
        showPastEvents,
        types: [],
      }).map(event => ({ source: "f1", event }));
    case "ipl":
      return filterIplEvents(events as IplEvent[], {
        showPastEvents,
        teamIds: [],
      }).map(event => ({ source: "ipl", event }));
    case "fifa":
      return filterFifaEvents(events as FifaEvent[], {
        showPastEvents,
        teamIds: [],
      }).map(event => ({ source: "fifa", event }));
  }
}

const leagueLabel = (league: HomeLeague) =>
  HOME_LEAGUE_OPTIONS.find(o => o.id === league)?.label ?? league;

const teamLabel = (teamId: string) =>
  CRICKET_NATIONAL_TEAMS.find(t => t.id === teamId)?.name ?? teamId;

/**
 * Fetches every selected source (one cached React Query entry per cricket
 * team / league, so toggling a source off and on refetches nothing within the
 * stale window), merges the results into one chronological list of tagged
 * entries, and applies the cricket format filter plus each league's own
 * past-events rule. Nothing selected → no queries at all.
 *
 * A failed source is surfaced by label in `failedSources` while the rest of
 * the schedule still renders.
 */
export function useCombinedSchedule(
  selection: HomeSelection,
  showPastEvents: boolean
) {
  const teamResults = useQueries({
    queries: selection.teamIds.map(teamId => ({
      queryKey: ["home", "cricket-team", teamId],
      queryFn: () => fetchAllCricketTeamEvents(teamId),
    })),
  });

  const leagueResults = useQueries({
    queries: selection.leagues.map(league => ({
      queryKey: ["home", "league", league],
      queryFn: LEAGUE_FETCHERS[league],
    })),
  });

  // Two selected teams can share a match (e.g. India v Sri Lanka) — dedupe by
  // event id before filtering.
  const cricketById = new Map<string, CricketTeamEvent>();
  for (const result of teamResults) {
    for (const event of result.data ?? []) {
      if (!cricketById.has(event.id)) cricketById.set(event.id, event);
    }
  }
  const cricketEntries: CombinedEntry[] = filterCricketTeamEvents(
    [...cricketById.values()],
    { showPastEvents, formats: selection.formats }
  ).map(event => ({ source: "cricket-team", event }));

  const leagueEntries = selection.leagues.flatMap((league, i) =>
    filterLeagueEntries(league, leagueResults[i].data ?? [], showPastEvents)
  );

  const entries = [...cricketEntries, ...leagueEntries].sort(
    (a, b) =>
      new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
  );

  const failedSources = [
    ...selection.teamIds
      .filter((_, i) => teamResults[i].isError)
      .map(teamLabel),
    ...selection.leagues
      .filter((_, i) => leagueResults[i].isError)
      .map(leagueLabel),
  ];

  const isLoading =
    teamResults.some(r => r.isLoading) || leagueResults.some(r => r.isLoading);

  return { entries, isLoading, failedSources };
}
