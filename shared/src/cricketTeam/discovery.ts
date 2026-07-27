import { mapWithConcurrency } from "../espn/mapWithConcurrency.ts";
import { fetchEspnJson } from "./fetchJson.ts";
import { CRICKET_TEAM_DISCOVERY } from "./types.ts";

const FETCH_CONCURRENCY = 8;

/** One series (ESPN cricket "league") a team was discovered in. */
export type CricketSeriesRef = {
  id: string;
  name: string; // e.g. "India tour of Zimbabwe 2026"
};

// Internal types for the scoreboard header response (only the fields read here)
type HeaderCompetitor = { id: string };
type HeaderEvent = { competitors?: HeaderCompetitor[] };
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
 * `YYYYMM`), returning the series active in that span. Transport failures are
 * retried and then thrown (see {@link fetchEspnJson}) — a query that never
 * lands leaves its span of the calendar unscanned, which would look exactly
 * like "no cricket in that span".
 */
async function fetchHeaderLeagues(dateParam: string): Promise<HeaderLeague[]> {
  const url = `https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&dates=${dateParam}`;
  const data = await fetchEspnJson<HeaderResponse>(url);
  return data.sports?.[0]?.leagues ?? [];
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
 * Discovery only needs to spot each series **once**: the caller
 * (`fetchAllCricketTeamEvents`) then pulls that series' full event list by
 * year. That is why no per-day "truncation top-up" is needed even though busy
 * month responses truncate long event lists — a national side is never in the
 * dense domestic leagues that get truncated, and its own bilateral series /
 * ICC events are short enough that at least one of their matches always lands
 * in a daily query or the head of a month response. The only coverage repair
 * kept is a single retry for a month that returns empty on a cold ESPN cache —
 * an empty response is valid (fully past months always return empty), so it is
 * distinct from the transport failures {@link fetchEspnJson} retries.
 *
 * @param teamId - ESPN cricket team id (see `CRICKET_NATIONAL_TEAMS`).
 * @param now - The reference "today" for the window; defaults to current time.
 * @returns The team's series, deduped, in discovery order.
 * @throws If any discovery query fails every attempt, rather than returning a
 * scan with an unscanned hole in it.
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

  const monthlyLeagues = await mapWithConcurrency(
    months,
    FETCH_CONCURRENCY,
    async month => {
      const leagues = await fetchHeaderLeagues(month);
      // Retry once for a cold-cache empty before giving up on the month.
      return leagues.length > 0 ? leagues : await fetchHeaderLeagues(month);
    }
  );
  collect(monthlyLeagues.flat());

  return [...seriesById.values()];
}
