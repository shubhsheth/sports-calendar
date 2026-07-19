import type { CricketMatchFormat } from "@sports-calendar/shared";
import { CRICKET_NATIONAL_TEAMS } from "@sports-calendar/shared";

export type HomeLeague = "nba" | "nfl" | "f1" | "ipl" | "fifa";

/** What the user has picked on the home page (persisted in localStorage). */
export type HomeSelection = {
  teamIds: string[]; // cricket national team ids
  leagues: HomeLeague[];
  formats: CricketMatchFormat[]; // cricket format filter; empty = all
};

export const HOME_SELECTION_STORAGE_KEY = "home-selection";

export const EMPTY_HOME_SELECTION: HomeSelection = {
  teamIds: [],
  leagues: [],
  formats: [],
};

export const HOME_LEAGUE_OPTIONS: Array<{ id: HomeLeague; label: string }> = [
  { id: "nba", label: "NBA" },
  { id: "nfl", label: "NFL" },
  { id: "f1", label: "F1" },
  { id: "ipl", label: "IPL" },
  { id: "fifa", label: "FIFA World Cup" },
];

export const HOME_FORMAT_OPTIONS: Array<{
  id: CricketMatchFormat;
  label: string;
}> = [
  { id: "test", label: "Test" },
  { id: "odi", label: "ODI" },
  { id: "t20i", label: "T20I" },
  { id: "other", label: "Other" },
];

export function hasSelection(selection: HomeSelection): boolean {
  return selection.teamIds.length > 0 || selection.leagues.length > 0;
}

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter(v => v !== value)
    : [...values, value];
}

export function toggleTeam(
  selection: HomeSelection,
  teamId: string
): HomeSelection {
  return { ...selection, teamIds: toggle(selection.teamIds, teamId) };
}

export function toggleLeague(
  selection: HomeSelection,
  league: HomeLeague
): HomeSelection {
  return { ...selection, leagues: toggle(selection.leagues, league) };
}

export function toggleFormat(
  selection: HomeSelection,
  format: CricketMatchFormat
): HomeSelection {
  return { ...selection, formats: toggle(selection.formats, format) };
}

/**
 * Repairs whatever came out of localStorage into a valid `HomeSelection`:
 * non-arrays become empty and unknown team/league/format ids are dropped, so
 * stale entries from older app versions can never crash the page.
 */
export function normalizeSelection(stored: unknown): HomeSelection {
  const raw = (stored ?? {}) as Partial<Record<keyof HomeSelection, unknown>>;
  const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

  const knownTeamIds = new Set(CRICKET_NATIONAL_TEAMS.map(t => t.id));
  const knownLeagues = new Set(HOME_LEAGUE_OPTIONS.map(o => o.id));
  const knownFormats = new Set(HOME_FORMAT_OPTIONS.map(o => o.id));

  return {
    teamIds: asArray(raw.teamIds).filter(
      (v): v is string => typeof v === "string" && knownTeamIds.has(v)
    ),
    leagues: asArray(raw.leagues).filter((v): v is HomeLeague =>
      knownLeagues.has(v as HomeLeague)
    ),
    formats: asArray(raw.formats).filter((v): v is CricketMatchFormat =>
      knownFormats.has(v as CricketMatchFormat)
    ),
  };
}
