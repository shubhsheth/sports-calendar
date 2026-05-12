import type { IplTeam } from "@sports-calendar/shared";
import { IPL_2026 } from "./fetchIplEvents";

function teamLogoUrl(id: string): string {
  return `https://a.espncdn.com/i/teamlogos/cricket/500/${id}.png`;
}

export async function fetchIplTeams(): Promise<IplTeam[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${IPL_2026.LEAGUE_ID}/scoreboard`;
  const response = await fetch(url);
  const data = await response.json();

  const teams = (data.teams ?? []) as {
    id: string;
    displayName: string;
    abbreviation: string;
  }[];

  return teams
    .map(t => ({
      id: t.id,
      displayName: t.displayName,
      abbreviation: t.abbreviation,
      logo: teamLogoUrl(t.id),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
