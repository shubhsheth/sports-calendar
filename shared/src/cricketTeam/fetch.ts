import type { CricketMatchFormat, CricketTeamEvent } from "./types.ts";
import { mapWithConcurrency } from "../espn/mapWithConcurrency.ts";
import { discoverTeamSeriesIds, type CricketSeriesRef } from "./discovery.ts";

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
  const response = await fetch(url);
  const data = (await response.json()) as SeriesScoreboardResponse;
  const calendar = data.leagues?.[0]?.calendar ?? [];
  const days = calendar.map(iso => iso.slice(0, 10).replaceAll("-", ""));
  return [...new Set(days)];
}

/**
 * Fetches one day of a series from the Site API scoreboard
 * (`…/cricket/{seriesId}/scoreboard?dates=YYYYMMDD`). Events come back inline
 * (competitors, logos, venue, status — same shape as IPL) and are normalized
 * into `CricketTeamEvent`s, tagging each with the series and its match format
 * (from `competitions[0].class`). Days with no matches return an empty array.
 *
 * @param series - The series to fetch (id + display name).
 * @param dateStr - The day to fetch, as `YYYYMMDD`.
 * @returns The day's matches; empty if there are none.
 */
export async function fetchSeriesEventsByDate(
  series: CricketSeriesRef,
  dateStr: string
): Promise<CricketTeamEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${series.id}/scoreboard?dates=${dateStr}`;
  const response = await fetch(url);
  const data = (await response.json()) as SeriesScoreboardResponse;
  const name = data.leagues?.[0]?.name ?? series.name;
  return (data.events ?? []).map(e =>
    normalizeEvent(e, { id: series.id, name })
  );
}

/**
 * Fetches every match a national team plays in the discovery window, across
 * all its series: series discovery (`discoverTeamSeriesIds`) → each series'
 * match-day calendar → each day's events → keep events where the team is a
 * competitor (exact id) → dedupe by event id (a Test returns once per match
 * day) → sort chronologically.
 *
 * @param teamId - ESPN cricket team id (see `CRICKET_NATIONAL_TEAMS`).
 * @param now - The reference "today" for the window; defaults to current time.
 * @returns The team's matches across all discovered series, in date order.
 */
export async function fetchAllCricketTeamEvents(
  teamId: string,
  now: Date = new Date()
): Promise<CricketTeamEvent[]> {
  const series = await discoverTeamSeriesIds(teamId, now);

  const calendars = await mapWithConcurrency(
    series,
    FETCH_CONCURRENCY,
    async s => ({ series: s, days: await fetchSeriesCalendar(s.id) })
  );
  const seriesDays = calendars.flatMap(({ series: s, days }) =>
    days.map(day => ({ series: s, day }))
  );

  const eventsByDay = await mapWithConcurrency(
    seriesDays,
    FETCH_CONCURRENCY,
    ({ series: s, day }) => fetchSeriesEventsByDate(s, day)
  );

  const eventsById = new Map<string, CricketTeamEvent>();
  for (const event of eventsByDay.flat()) {
    if (!eventsById.has(event.id) && hasCompetitor(event, teamId)) {
      eventsById.set(event.id, event);
    }
  }
  return [...eventsById.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function hasCompetitor(event: CricketTeamEvent, teamId: string): boolean {
  return event.competitors.some(c => c.id === teamId);
}
