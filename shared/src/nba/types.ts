import type { BaseEvent } from "../espn/fetchEventDetails.ts";

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
  status?: { $ref: string }; // absent on games far in the future
  venue?: {
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
  winner?: boolean; // only present on completed games
  team: { $ref: string }; // follow via fetchTeamDetails for logos
  score?: { $ref: string }; // present but never followed — schedule-focused
};

export type NbaTeam = {
  $ref: string;
  id: string;
  name: string;
  displayName: string;
  logos: {
    href: string;
    rel: string[]; // variant tags, e.g. ["default"] / ["dark"]; cards use "default"
  }[];
};

export type NbaEventFilters = {
  showPastEvents: boolean;
  teamIds: string[]; // empty = no filter (all teams shown)
};
