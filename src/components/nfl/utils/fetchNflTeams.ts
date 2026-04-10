import {fetchTeamDetails} from '@/api/espn/fetchTeamDetails';
import type {NflTeam} from '@/types/nfl';

export async function fetchNflTeams(): Promise<NflTeam[]> {
  const url =
    'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams?limit=100';
  const response = await fetch(url);
  const data = await response.json();
  const teams = await Promise.all(
    (data.items as {$ref: string}[]).map(item =>
      fetchTeamDetails<NflTeam>(item.$ref)
    )
  );
  return teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
