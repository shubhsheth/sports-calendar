import { fetchTeamDetails } from "@/api/espn/fetchTeamDetails";
import type { FifaTeam } from "@sports-calendar/shared";

export async function fetchFifaTeams(): Promise<FifaTeam[]> {
  const url =
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/teams?limit=100";
  const response = await fetch(url);
  const data = await response.json();
  const teams = await Promise.all(
    (data.items as { $ref: string }[]).map(item =>
      fetchTeamDetails<FifaTeam>(item.$ref)
    )
  );
  return teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
