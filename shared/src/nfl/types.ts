import type { BaseEvent } from "../espn/fetchEventDetails.ts";

export type NflEvent = BaseEvent & {
  competitions: NflEventCompetition[];
};

export type NflEventCompetition = {
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
  status?: { $ref: string };
  venue?: {
    $ref: string;
    fullName: string;
    address: {
      city: string;
      state: string;
    };
  };
  competitors: NflCompetitor[];
};

export type NflCompetitor = {
  $ref: string;
  homeAway: "home" | "away";
  winner?: boolean;
  team: { $ref: string };
  score?: { $ref: string };
};

export type NflTeam = {
  $ref: string;
  id: string;
  name: string;
  displayName: string;
  logos: {
    href: string;
    rel: string[];
  }[];
};

export type NflEventFilters = {
  showPastEvents: boolean;
  teamIds: string[]; // empty = no filter (all teams shown)
};
