import type { BaseEvent, BaseTeam } from "./base";

export type NbaEvent = BaseEvent & {
  competitions: NbaEventCompetition[];
};

export type NbaEventCompetition = {
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
  gameSource: {
    id: string;
    description: string;
    state: string;
  };
  status?: { $ref: string };
  venue: {
    $ref: string;
    fullName: string;
    address: {
      city: string;
      state: string;
    };
  };
  competitors: NbaCompetitor[];
};

export type NbaCompetitor = {
  $ref: string;
  homeAway: "home" | "away";
  winner?: boolean;
  team: { $ref: string };
  score?: { $ref: string };
};

export type NbaTeam = BaseTeam & {
  logos: {
    href: string;
    rel: string[];
  }[];
};

export type NbaEventFilters = {
  showPastEvents: boolean;
};
