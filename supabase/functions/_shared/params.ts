import type {
  F1EventFilters,
  FifaEventFilters,
  IplEventFilters,
  NbaEventFilters,
  NflEventFilters,
} from "@sports-calendar/shared";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type Query = Record<string, string>;

/** Valid F1 session type IDs: Practice, Qualifying, Race, Sprint Qualifying, Sprint Race */
const F1_VALID_TYPES = ["1", "2", "3", "5", "6"];

/**
 * Backend feeds always include past events so subscribed calendars retain
 * full-season history. The shared filter types still require `showPastEvents`,
 * so we pin it to `true` (which disables the past-event filter) and ignore any
 * `showPastEvents` query param.
 */
const SHOW_PAST_EVENTS = true;

/** Split a comma-separated query value into trimmed, non-empty IDs. Absent/empty = no filter. */
function parseCommaList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/** Shared shape for the team-filtered leagues (NBA / NFL / IPL / FIFA). */
function parseTeamFilters(
  query: Query
): ParseResult<{ showPastEvents: boolean; teamIds: string[] }> {
  return {
    ok: true,
    value: {
      showPastEvents: SHOW_PAST_EVENTS,
      teamIds: parseCommaList(query.teamIds),
    },
  };
}

export function parseNbaParams(query: Query): ParseResult<NbaEventFilters> {
  return parseTeamFilters(query);
}

export function parseNflParams(query: Query): ParseResult<NflEventFilters> {
  return parseTeamFilters(query);
}

export function parseIplParams(query: Query): ParseResult<IplEventFilters> {
  return parseTeamFilters(query);
}

export function parseFifaParams(query: Query): ParseResult<FifaEventFilters> {
  return parseTeamFilters(query);
}

export function parseF1Params(query: Query): ParseResult<F1EventFilters> {
  const requested = parseCommaList(query.types);
  const types = requested.length > 0 ? requested : [...F1_VALID_TYPES];

  const invalid = types.filter(t => !F1_VALID_TYPES.includes(t));
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `Invalid F1 session type(s): ${invalid.join(", ")} (valid: ${F1_VALID_TYPES.join(", ")})`,
    };
  }

  return {
    ok: true,
    value: { showPastEvents: SHOW_PAST_EVENTS, types },
  };
}
