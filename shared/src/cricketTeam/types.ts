import type { IplEvent } from "../ipl/types.ts";

/**
 * Match formats, mapped from the Site API's
 * `competitions[0].class.internationalClassId` (`"1"` Test · `"2"` ODI ·
 * `"3"` T20I). Anything else — domestic classes, youth internationals — is
 * `"other"`.
 */
export type CricketMatchFormat = "test" | "odi" | "t20i" | "other";

/**
 * One match of a followed national team. ESPN has no team-schedule endpoint
 * for cricket, so these are assembled from per-series Site API scoreboards
 * (same inline shape the IPL module parses) found via the series-discovery
 * scan; `seriesId`/`seriesName` record where each match came from.
 */
export type CricketTeamEvent = IplEvent & {
  seriesId: string;
  seriesName: string; // e.g. "India tour of Sri Lanka 2026"
  format: CricketMatchFormat;
  formatDetail: string; // e.g. "2nd T20I" (competition description; may be "")
  endDate?: string; // ISO 8601; Tests span multiple days (e.g. five)
};

export type CricketTeamFilters = {
  showPastEvents: boolean;
  formats: CricketMatchFormat[]; // empty = no filter (all formats shown)
};

export type CricketNationalTeam = {
  id: string;
  name: string;
  abbreviation: string;
  logo: string; // "https://a.espncdn.com/i/teamlogos/cricket/500/{id}.png"
};

const cricketLogo = (id: string) =>
  `https://a.espncdn.com/i/teamlogos/cricket/500/${id}.png`;

/**
 * The 12 ICC full-member men's national sides. IDs are ESPN/ESPNcricinfo
 * team IDs, each verified against live scoreboard data (2026-07-17). Women's,
 * U19, and A sides have distinct IDs (e.g. England Under-19s is 971), so
 * competitor matching against these IDs must be exact.
 */
export const CRICKET_NATIONAL_TEAMS: CricketNationalTeam[] = [
  { id: "1", name: "England", abbreviation: "ENG", logo: cricketLogo("1") },
  { id: "2", name: "Australia", abbreviation: "AUS", logo: cricketLogo("2") },
  { id: "3", name: "South Africa", abbreviation: "SA", logo: cricketLogo("3") },
  { id: "4", name: "West Indies", abbreviation: "WI", logo: cricketLogo("4") },
  { id: "5", name: "New Zealand", abbreviation: "NZ", logo: cricketLogo("5") },
  { id: "6", name: "India", abbreviation: "IND", logo: cricketLogo("6") },
  { id: "7", name: "Pakistan", abbreviation: "PAK", logo: cricketLogo("7") },
  { id: "8", name: "Sri Lanka", abbreviation: "SL", logo: cricketLogo("8") },
  { id: "9", name: "Zimbabwe", abbreviation: "ZIM", logo: cricketLogo("9") },
  {
    id: "25",
    name: "Bangladesh",
    abbreviation: "BAN",
    logo: cricketLogo("25"),
  },
  { id: "29", name: "Ireland", abbreviation: "IRE", logo: cricketLogo("29") },
  {
    id: "40",
    name: "Afghanistan",
    abbreviation: "AFG",
    logo: cricketLogo("40"),
  },
];

/**
 * Series-discovery window: how far back and forward the scan looks for series
 * the team plays in. How the window is actually covered — daily requests for
 * the lookback + current month, one month-granularity request per future
 * month — is decided by `getDiscoveryQueries` in `discovery.ts`, which
 * documents the header endpoint's quirks that force that split (~45–50
 * requests for this window).
 */
export const CRICKET_TEAM_DISCOVERY = {
  LOOKBACK_DAYS: 30,
  LOOKAHEAD_DAYS: 180,
};
