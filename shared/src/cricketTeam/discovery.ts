import { mapWithConcurrency } from "../espn/mapWithConcurrency.ts";
import { CRICKET_TEAM_DISCOVERY } from "./types.ts";

const FETCH_CONCURRENCY = 8;

// A month-response league with this many events listed may have been
// chronologically truncated by ESPN (observed: The Hundred cut mid-month at 20
// events while smaller series listed complete months), so its remaining days
// get a daily top-up scan.
const TRUNCATION_SUSPECT_EVENT_COUNT = 15;

/** One series (ESPN cricket "league") a team was discovered in. */
export type CricketSeriesRef = {
  id: string;
  name: string; // e.g. "India tour of Zimbabwe 2026"
};

// Internal types for the scoreboard header response (only the fields read here)
type HeaderCompetitor = { id: string };
type HeaderEvent = { date?: string; competitors?: HeaderCompetitor[] };
type HeaderLeague = { id: string; name: string; events?: HeaderEvent[] };
type HeaderResponse = { sports?: Array<{ leagues?: HeaderLeague[] }> };

function toDayParam(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Every day of `month` (`YYYYMM`) as `YYYYMMDD` params. */
function daysOfMonth(month: string): string[] {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(4)) - 1;
  const days: string[] = [];
  let current = new Date(Date.UTC(year, monthIndex, 1));
  while (current.getUTCMonth() === monthIndex) {
    days.push(toDayParam(current));
    current = addDays(current, 1);
  }
  return days;
}

/**
 * The header queries the discovery scan issues, chosen to cover the window
 * (`CRICKET_TEAM_DISCOVERY`) without gaps:
 *
 * - `dailyDates` (`YYYYMMDD`) — every day from `LOOKBACK_DAYS` before `now`
 *   through the end of the current UTC month. Daily requests are the only
 *   reliable way to read this span: fully past months return empty from the
 *   month endpoint, and the current month's response truncates events a few
 *   days past "today" (both verified live 2026-07-18). Sampling coarser than
 *   daily is not safe — bilateral series often play alternate days and can
 *   phase-lock entirely between samples (a 3-day cadence missed 2 of India's
 *   4 series when tried).
 * - `months` (`YYYYMM`) — each following month through the one containing
 *   `now + LOOKAHEAD_DAYS`. Future months return the month's series in one
 *   request.
 *
 * @param now - The reference "today"; defaults to the current time.
 */
export function getDiscoveryQueries(now: Date = new Date()): {
  dailyDates: string[];
  months: string[];
} {
  const { LOOKBACK_DAYS, LOOKAHEAD_DAYS } = CRICKET_TEAM_DISCOVERY;

  const monthOrdinal = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();

  const dailyDates: string[] = [];
  let current = addDays(now, -LOOKBACK_DAYS);
  while (monthOrdinal(current) <= monthOrdinal(now)) {
    dailyDates.push(toDayParam(current));
    current = addDays(current, 1);
  }

  const months: string[] = [];
  const horizon = addDays(now, LOOKAHEAD_DAYS);
  let month = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  while (month <= horizon) {
    const y = month.getUTCFullYear();
    const m = String(month.getUTCMonth() + 1).padStart(2, "0");
    months.push(`${y}${m}`);
    month = new Date(Date.UTC(y, month.getUTCMonth() + 1, 1));
  }

  return { dailyDates, months };
}

/**
 * Fetches the scoreboard header for one `dates` param (`YYYYMMDD` or
 * `YYYYMM`), returning the series active in that span. Errors and malformed
 * responses yield `[]` so one bad response can't sink the whole scan.
 */
async function fetchHeaderLeagues(dateParam: string): Promise<HeaderLeague[]> {
  const url = `https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&dates=${dateParam}`;
  try {
    const response = await fetch(url);
    const data = (await response.json()) as HeaderResponse;
    return data.sports?.[0]?.leagues ?? [];
  } catch {
    return [];
  }
}

function leagueHasTeam(league: HeaderLeague, teamId: string): boolean {
  return (league.events ?? []).some(event =>
    (event.competitors ?? []).some(c => c.id === teamId)
  );
}

/**
 * Finds every series (ESPN cricket "league") a team plays in the discovery
 * window. ESPN has no team-schedule endpoint for cricket, so this scans the
 * scoreboard header endpoint (`…/scoreboard/header?sport=cricket&dates=…`),
 * which lists each series active in the requested span along with its events'
 * competitor team ids. A series is kept if the team appears as a competitor —
 * by exact id, since women's/U19/A sides are distinct teams with their own ids
 * (e.g. England is 1, England Under-19s is 971).
 *
 * The scan issues the queries from `getDiscoveryQueries`, then repairs the
 * month endpoint's two verified failure modes:
 *
 * - A month can transiently return empty while ESPN warms its cache — retried
 *   once, then degraded to daily requests for that month's days.
 * - A month response can chronologically truncate a busy league's event list
 *   (see `TRUNCATION_SUSPECT_EVENT_COUNT`), which could hide this team's
 *   matches in a dense tournament — the days after such a league's last
 *   listed event get a daily top-up scan.
 *
 * @param teamId - ESPN cricket team id (see `CRICKET_NATIONAL_TEAMS`).
 * @param now - The reference "today" for the window; defaults to current time.
 * @returns The team's series, deduped, in discovery order.
 */
export async function discoverTeamSeriesIds(
  teamId: string,
  now: Date = new Date()
): Promise<CricketSeriesRef[]> {
  const { dailyDates, months } = getDiscoveryQueries(now);

  const seriesById = new Map<string, CricketSeriesRef>();
  const collect = (leagues: HeaderLeague[]) => {
    for (const league of leagues) {
      if (!seriesById.has(league.id) && leagueHasTeam(league, teamId)) {
        seriesById.set(league.id, { id: league.id, name: league.name });
      }
    }
  };

  const dailyLeagues = await mapWithConcurrency(
    dailyDates,
    FETCH_CONCURRENCY,
    fetchHeaderLeagues
  );
  collect(dailyLeagues.flat());

  const monthlyResults = await mapWithConcurrency(
    months,
    FETCH_CONCURRENCY,
    async month => {
      let leagues = await fetchHeaderLeagues(month);
      if (leagues.length === 0) leagues = await fetchHeaderLeagues(month);
      return { month, leagues };
    }
  );

  const topUpDays = new Set<string>();
  for (const { month, leagues } of monthlyResults) {
    if (leagues.length === 0) {
      // Month endpoint failed twice — cover the whole month daily instead.
      for (const day of daysOfMonth(month)) topUpDays.add(day);
      continue;
    }
    collect(leagues);
    for (const league of leagues) {
      const events = league.events ?? [];
      if (events.length < TRUNCATION_SUSPECT_EVENT_COUNT) continue;
      if (leagueHasTeam(league, teamId)) continue;
      const lastListedDay = events
        .map(e => (e.date ?? "").slice(0, 10).replaceAll("-", ""))
        .filter(d => d.length === 8)
        .sort()
        .at(-1);
      if (!lastListedDay) continue;
      for (const day of daysOfMonth(month)) {
        if (day > lastListedDay) topUpDays.add(day);
      }
    }
  }

  if (topUpDays.size > 0) {
    const topUpLeagues = await mapWithConcurrency(
      [...topUpDays].sort(),
      FETCH_CONCURRENCY,
      fetchHeaderLeagues
    );
    collect(topUpLeagues.flat());
  }

  return [...seriesById.values()];
}
