import type { IplEvent } from "@sports-calendar/shared";
import dayjs from "dayjs";

const LEAGUE_ID = "8048";

export const IPL_2026 = {
  LEAGUE_ID,
  START_DATE: "2026-03-28",
  // Extended to June 1 to capture playoff games once ESPN schedules them
  END_DATE: "2026-06-01",
};

// Internal types for the scoreboard response (different shape from IplEvent)
type ScoreboardCompetitor = {
  uid: string;
  order: number;
  homeAway: "home" | "away";
  winner: string | boolean;
  score: string;
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
};

type ScoreboardEvent = {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  competitions: Array<{
    date: string;
    timeValid: boolean;
    status: {
      type: {
        id: string;
        state: string;
        description: string;
        detail: string;
        shortDetail: string;
      };
      summary: string;
    };
    venue?: { fullName: string };
    competitors: ScoreboardCompetitor[];
  }>;
};

function normalizeEvent(event: ScoreboardEvent): IplEvent {
  const competition = event.competitions[0];
  return {
    id: event.id,
    uid: event.uid,
    date: competition?.date ?? event.date,
    timeValid: competition?.timeValid ?? true,
    name: event.name,
    shortName: event.shortName,
    fullStatus: {
      type: {
        id: competition?.status.type.id ?? "0",
        state: (competition?.status.type.state ?? "pre") as
          | "pre"
          | "in"
          | "post",
        description: competition?.status.type.description ?? "",
        detail: competition?.status.type.detail ?? "",
        shortDetail: competition?.status.type.shortDetail ?? "",
      },
      summary: competition?.status.summary ?? "",
      longSummary: competition?.status.type.detail ?? "",
    },
    competitors: (competition?.competitors ?? []).map(c => ({
      id: c.team.id,
      uid: c.uid,
      order: c.order,
      homeAway: c.homeAway,
      winner: c.winner === true || c.winner === "true",
      displayName: c.team.displayName,
      abbreviation: c.team.abbreviation,
      score: c.score,
      logo: c.team.logo,
    })),
    venue: competition?.venue
      ? { fullName: competition.venue.fullName }
      : undefined,
  };
}

export async function fetchIplEventsByDate(
  dateStr: string
): Promise<IplEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${LEAGUE_ID}/scoreboard?dates=${dateStr}`;
  const response = await fetch(url);
  const data = await response.json();
  return ((data.events ?? []) as ScoreboardEvent[]).map(normalizeEvent);
}

export function getIplSeasonDates(): string[] {
  const dates: string[] = [];
  let current = dayjs(IPL_2026.START_DATE);
  const end = dayjs(IPL_2026.END_DATE);
  while (!current.isAfter(end)) {
    dates.push(current.format("YYYYMMDD"));
    current = current.add(1, "day");
  }
  return dates;
}
