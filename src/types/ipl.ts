export type IplEvent = {
  id: string;
  uid: string;
  date: string; // ISO 8601 e.g. "2026-04-11T10:00:00Z"
  timeValid: boolean;
  name: string; // e.g. "Punjab Kings v Sunrisers Hyderabad"
  shortName: string; // e.g. "PBKS v SRH"
  fullStatus: {
    type: {
      id: string;
      state: "pre" | "in" | "post";
      description: string;
      detail: string;
      shortDetail: string;
    };
    summary: string; // e.g. "Starts at 15:30 local time"
    longSummary: string;
  };
  competitors: IplCompetitor[];
  venue?: {
    fullName: string;
  };
};

export type IplCompetitor = {
  id: string;
  uid: string;
  order: number; // 1 = home, 2 = away
  homeAway: "home" | "away";
  winner: boolean;
  displayName: string; // e.g. "Punjab Kings"
  abbreviation: string; // e.g. "PBKS"
  score: string; // "" pre-match, "142/6 (20)" post-match
  logo: string; // direct URL, not a $ref
};

export type IplTeam = {
  id: string;
  displayName: string;
  abbreviation: string;
  logo: string; // "https://a.espncdn.com/i/teamlogos/cricket/500/{id}.png"
};

export type IplEventFilters = {
  showPastEvents: boolean;
  teamIds: string[]; // empty = no filter (all teams shown)
};
