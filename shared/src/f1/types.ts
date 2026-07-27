import type { BaseEvent } from "../espn/fetchEventDetails.ts";

export type F1Event = BaseEvent & {
  competitions: F1EventCompetition[];
};

/**
 * One F1 session (practice / qualifying / race). An F1 event is a whole race
 * weekend containing 4–6 of these. Unlike NBA/NFL competitions there are no
 * `competitors` or `venue`, and `type.id` denotes the session type rather than a
 * season phase (see `translateF1EventType*`).
 */
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
  status: { $ref: string };
  session: number;
};

export type F1EventFilters = {
  showPastEvents: boolean;
  types: string[];
};

/**
 * F1 `competition.type.id` identifies the session within a race weekend. Known
 * IDs and their API abbreviations:
 *   1 → Free Practice (FP1/FP2/FP3 — the abbreviation distinguishes them)
 *   2 → Qualifying (Qual)
 *   3 → Race
 *   5 → Sprint Qualifying (SS, "Sprint Shootout")
 *   6 → Sprint Race (SR)
 * Type 4 ("Sprint") is the legacy pre-2023 sprint format and is intentionally
 * unmapped. The F1 route hides practice by default (shows types 2, 3, 5, 6).
 *
 * `translateF1EventTypeAbbr` maps the API's `abbreviation`; `…Id` maps the
 * numeric `id`.
 *
 * @param type - The API `competition.type.abbreviation` (e.g. `FP1`, `Qual`, `SR`).
 * @returns The human-readable session name, or the input unchanged if unrecognized.
 */
export function translateF1EventTypeAbbr(type: string): string {
  switch (type) {
    case "FP1":
      return "Free Practice 1";
    case "FP2":
      return "Free Practice 2";
    case "FP3":
      return "Free Practice 3";
    case "SS":
      return "Sprint Qualifying";
    case "SR":
      return "Sprint Race";
    case "Qual":
      return "Qualifying";
    default:
      return type;
  }
}

/**
 * Maps an F1 `competition.type.id` to a human-readable session name.
 *
 * @param type - The numeric `competition.type.id` as a string (e.g. `"3"`).
 * @returns The human-readable session name, or `"Other"` if unrecognized.
 */
export function translateF1EventTypeId(type: string): string {
  switch (type) {
    case "1":
      return "Practice";
    case "2":
      return "Qualifying";
    case "3":
      return "Race";
    case "5":
      return "Sprint Qualifying";
    case "6":
      return "Sprint Race";
    default:
      return "Other";
  }
}
