import type { BaseEvent } from "./base";

export type F1Event = BaseEvent & {
  competitions: F1EventCompetition[];
};

export type F1EventCompetition = {
  $ref: string;
  id: string;
  date: string;
  type: {
    id: string;
    text: string;
    abbreviation: string;
  };
  timeValid: boolean;
  recent: boolean;
  bracketAvailable: boolean;
  gameSource: {
    id: string;
    description: string;
    state: string;
  };
  status: { $ref: string };
  session: number;
};

export type F1EventFilters = {
  showPastEvents: boolean;
  types: string[];
};
