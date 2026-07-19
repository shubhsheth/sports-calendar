import type { CricketTeamEvent } from "./types.ts";

/** Test-only factory for a normalized cricket-team event. */
export function makeCricketTeamEvent(
  overrides: Partial<CricketTeamEvent> = {}
): CricketTeamEvent {
  return {
    id: "1544001",
    uid: "s:200~e:1544001",
    date: "2026-08-15T04:30Z",
    endDate: undefined,
    timeValid: true,
    name: "Sri Lanka v India",
    shortName: "SL v IND",
    seriesId: "24567",
    seriesName: "India tour of Sri Lanka 2026",
    format: "t20i",
    formatDetail: "1st T20I",
    fullStatus: {
      type: {
        id: "0",
        state: "pre",
        description: "Scheduled",
        detail: "Scheduled",
        shortDetail: "Scheduled",
      },
      summary: "Starts at 10:00 local time",
      longSummary: "Scheduled",
    },
    competitors: [
      {
        id: "8",
        uid: "s:200~e:1544001~c:1544001~t:8",
        order: 1,
        homeAway: "home",
        winner: false,
        displayName: "Sri Lanka",
        abbreviation: "SL",
        score: "",
        logo: "https://a.espncdn.com/i/teamlogos/cricket/500/8.png",
      },
      {
        id: "6",
        uid: "s:200~e:1544001~c:1544001~t:6",
        order: 2,
        homeAway: "away",
        winner: false,
        displayName: "India",
        abbreviation: "IND",
        score: "",
        logo: "https://a.espncdn.com/i/teamlogos/cricket/500/6.png",
      },
    ],
    venue: { fullName: "Galle International Stadium" },
    ...overrides,
  };
}
