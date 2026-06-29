import type { BaseEvent } from "../espn/fetchEventDetails.ts";

/** Typical duration of a soccer match in minutes (incl. halftime) */
export const FIFA_DURATION_MINUTES = 120;

export type FifaEvent = BaseEvent & {
  competitions: FifaEventCompetition[];
};

export type FifaEventCompetition = {
  $ref: string;
  id: string;
  date: string;
  type: {
    id: string;
    text: string;
    abbreviation: string;
    slug?: string;
    type?: string;
  };
  timeValid: boolean;
  recent: boolean;
  bracketAvailable: boolean;
  gameSource?: {
    id: string;
    description: string;
    state: string;
  };
  boxscoreSource?: {
    id: string;
    description: string;
    state: string;
  };
  status?: { $ref: string };
  venue?: {
    $ref: string;
    fullName: string;
    address: {
      city: string;
      state?: string;
      country?: string;
    };
  };
  competitors: FifaCompetitor[];
};

export type FifaCompetitor = {
  $ref: string;
  homeAway: "home" | "away";
  winner?: boolean;
  team: { $ref: string };
  score?: { $ref: string };
};

export type FifaTeam = {
  $ref: string;
  id: string;
  name: string;
  displayName: string;
  logos: {
    href: string;
    rel: string[];
  }[];
};

export type FifaEventFilters = {
  showPastEvents: boolean;
  teamIds: string[]; // empty = no filter (all teams shown)
};
