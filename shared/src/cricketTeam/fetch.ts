import type { CricketMatchFormat, CricketTeamEvent } from "./types.ts";
import { CRICKET_TEAM_DISCOVERY } from "./types.ts";
import { mapWithConcurrency } from "../espn/mapWithConcurrency.ts";
import { discoverTeamSeriesIds, type CricketSeriesRef } from "./discovery.ts";
import { fetchEspnJson } from "./fetchJson.ts";

const FETCH_CONCURRENCY = 8;

// Internal types for the series scoreboard response — the same Site API shape
// the IPL module parses (see shared/src/ipl/fetch.ts), plus the fields cricket
// tours expose that IPL doesn't use: `class` (match format), `description`
// ("2nd T20I"), and `endDate` (multi-day Tests).
type ScoreboardCompetitor = {
  uid: string;
  order: number;
  homeAway: "home" | "away";
  winner: string | boolean;
  score: string;
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
};

type ScoreboardEvent = {
  id: string;
  uid: string;
  date: string;
  endDate?: string;
  name: string;
  shortName: string;
  competitions: Array<{
    date: string;
    endDate?: string;
    timeValid: boolean;
    description?: string;
    class?: {
      internationalClassId?: string;
    };
    status: {
      type: {
        id: string;
        state: string;
        description: string;
        detail: string;
        shortDetail: string;
      };
      summary: string;
    };
    venue?: { fullName: string };
    competitors: ScoreboardCompetitor[];
  }>;
};

type SeriesScoreboardResponse = {
  leagues?: Array<{ id: string; name: string; calendar?: string[] }>;
  events?: ScoreboardEvent[];
};

/**
 * Maps the Site API's `competitions[0].class.internationalClassId` to a
 * `CricketMatchFormat`: `"1"` Test · `"2"` ODI · `"3"` T20I; anything else
 * (domestic classes, youth internationals, missing) is `"other"`.
 */
function toMatchFormat(internationalClassId?: string): CricketMatchFormat {
  switch (internationalClassId) {
    case "1":
      return "test";
    case "2":
      return "odi";
    case "3":
      return "t20i";
    default:
      return "other";
  }
}

function normalizeEvent(
  event: ScoreboardEvent,
  series: CricketSeriesRef
): CricketTeamEvent {
  const competition = event.competitions[0];
  return {
    id: event.id,
    uid: event.uid,
    date: competition?.date ?? event.date,
    endDate: competition?.endDate ?? event.endDate,
    timeValid: competition?.timeValid ?? true,
    name: event.name,
    shortName: event.shortName,
    seriesId: series.id,
    seriesName: series.name,
    format: toMatchFormat(competition?.class?.internationalClassId),
    formatDetail: competition?.description ?? "",
    fullStatus: {
      type: {
        id: competition?.status.type.id ?? "0",
        state: (competition?.status.type.state ?? "pre") as
          | "pre"
          | "in"
          | "post",
        description: competition?.status.type.description ?? "",
        detail: competition?.status.type.detail ?? "",
        shortDetail: competition?.status.type.shortDetail ?? "",
      },
      summary: competition?.status.summary ?? "",
      longSummary: competition?.status.type.detail ?? "",
    },
    competitors: (competition?.competitors ?? []).map(c => ({
      id: c.team.id,
      uid: c.uid,
      order: c.order,
      homeAway: c.homeAway,
      winner: c.winner === true || c.winner === "true",
      displayName: c.team.displayName,
      abbreviation: c.team.abbreviation,
      score: c.score,
      logo: c.team.logo,
    })),
    venue: competition?.venue
      ? { fullName: competition.venue.fullName }
      : undefined,
  };
}

/**
 * Fetches a series' match days from its scoreboard
 * (`…/cricket/{seriesId}/scoreboard`): every response carries
 * `leagues[0].calendar`, the ISO list of the series' match dates, regardless
 * of the requested date. Multi-day Tests appear once per match *day* (a 5-day
 * Test contributes 5 calendar entries), so callers fetching these dates must
 * dedupe the events they get back.
 *
 * @param seriesId - ESPN cricket series ("league") id.
 * @returns The series' match days as `YYYYMMDD`, deduped.
 */
export async function fetchSeriesCalendar(seriesId: string): Promise<string[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/scoreboard`;
  const data = await fetchEspnJson<SeriesScoreboardResponse>(url);
  const calendar = data.leagues?.[0]?.calendar ?? [];
  const days = calendar.map(iso => iso.slice(0, 10).replaceAll("-", ""));
  return [...new Set(days)];
}

/**
 * Fetches a slice of a series from the Site API scoreboard
 * (`…/cricket/{seriesId}/scoreboard?dates=…`). `dates` accepts a day
 * (`YYYYMMDD`) or a whole year (`YYYY`) — a year returns every one of that
 * series' matches in a single request (verified live), which is how the
 * team-schedule fetch avoids one request per match day. Events come back
 * inline (competitors, logos, venue, status — same shape as IPL) and are
 * normalized into `CricketTeamEvent`s, tagging each with the series and its
 * match format (from `competitions[0].class`). Empty slices return `[]`.
 *
 * @param series - The series to fetch (id + display name).
 * @param datesParam - `YYYYMMDD` (one day) or `YYYY` (a whole year).
 * @returns The slice's matches; empty if there are none.
 * @throws If the request fails every attempt. A year-sized slice is an entire
 * tour, so swallowing the failure would silently drop every match in it.
 */
export async function fetchSeriesEvents(
  series: CricketSeriesRef,
  datesParam: string
): Promise<CricketTeamEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${series.id}/scoreboard?dates=${datesParam}`;
  const data = await fetchEspnJson<SeriesScoreboardResponse>(url);
  const name = data.leagues?.[0]?.name ?? series.name;
  return (data.events ?? []).map(e =>
    normalizeEvent(e, { id: series.id, name })
  );
}

/** @deprecated Prefer {@link fetchSeriesEvents}; kept for pinned-match lookup. */
export const fetchSeriesEventsByDate = fetchSeriesEvents;

/** The distinct calendar years the discovery window touches (usually 1–2). */
function windowYears(now: Date): string[] {
  const { LOOKBACK_DAYS, LOOKAHEAD_DAYS } = CRICKET_TEAM_DISCOVERY;
  const first = new Date(now);
  first.setUTCDate(first.getUTCDate() - LOOKBACK_DAYS);
  const last = new Date(now);
  last.setUTCDate(last.getUTCDate() + LOOKAHEAD_DAYS);
  const years: string[] = [];
  for (let y = first.getUTCFullYear(); y <= last.getUTCFullYear(); y++) {
    years.push(String(y));
  }
  return years;
}

/**
 * Fetches every match a national team plays in the discovery window, across
 * all its series: series discovery (`discoverTeamSeriesIds`) → each discovered
 * series fetched whole by year (`fetchSeriesEvents`, one request per year the
 * window spans, usually one or two) → keep events where the team is a
 * competitor (exact id) → dedupe by event id (a series appearing in two years,
 * or a Test, resolves to one event) → sort chronologically.
 *
 * The window years, not the exact day range, bound the fetch — so a discovered
 * series' complete schedule is returned even if only part of it falls inside
 * the ±day window. Past matches are simply hidden by the default filter.
 *
 * @param teamId - ESPN cricket team id (see `CRICKET_NATIONAL_TEAMS`).
 * @param now - The reference "today" for the window; defaults to current time.
 * @returns The team's matches across all discovered series, in date order.
 * @throws If discovery or any series fetch fails every attempt. Callers get an
 * error they can retry instead of a schedule that is quietly missing matches.
 */
export async function fetchAllCricketTeamEvents(
  teamId: string,
  now: Date = new Date()
): Promise<CricketTeamEvent[]> {
  const series = await discoverTeamSeriesIds(teamId, now);
  const years = windowYears(now);

  const seriesYears = series.flatMap(s =>
    years.map(year => ({ series: s, year }))
  );
  const eventsByFetch = await mapWithConcurrency(
    seriesYears,
    FETCH_CONCURRENCY,
    ({ series: s, year }) => fetchSeriesEvents(s, year)
  );

  const eventsById = new Map<string, CricketTeamEvent>();
  for (const event of eventsByFetch.flat()) {
    if (!eventsById.has(event.id) && hasCompetitor(event, teamId)) {
      eventsById.set(event.id, event);
    }
  }
  return [...eventsById.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function hasCompetitor(event: CricketTeamEvent, teamId: string): boolean {
  return event.competitors.some(c => c.id === teamId);
}
