import type { BaseEvent } from "../espn/fetchEventDetails.ts";

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

/** Duration in minutes per F1 session type ID */
export const F1_SESSION_DURATIONS: Record<string, number> = {
  "1": 60, // Practice (FP1 / FP2 / FP3)
  "2": 60, // Qualifying
  "3": 120, // Race
  "4": 45, // Sprint Qualifying
  "6": 30, // Sprint Race
};

export function translateF1EventTypeAbbr(type: string): string {
  switch (type) {
    case "FP1":
      return "Free Practice 1";
    case "FP2":
      return "Free Practice 2";
    case "FP3":
      return "Free Practice 3";
    case "Sprint":
      return "Spring Qualifying";
    case "SR":
      return "Spring Race";
    case "Qual":
      return "Qualifying";
    default:
      return type;
  }
}

export function translateF1EventTypeId(type: string): string {
  switch (type) {
    case "1":
      return "Practice";
    case "2":
      return "Qualifying";
    case "3":
      return "Race";
    case "4":
      return "Spring Qualifying";
    case "6":
      return "Spring Race";
    default:
      return "Other";
  }
}
