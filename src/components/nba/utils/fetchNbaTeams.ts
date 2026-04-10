import {fetchTeamDetails} from '@/api/espn/fetchTeamDetails';
import type {NbaTeam} from '@/types/nba';

export async function fetchNbaTeams(): Promise<NbaTeam[]> {
  const url =
    'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams?limit=100';
  const response = await fetch(url);
  const data = await response.json();
  const teams = await Promise.all(
    (data.items as {$ref: string}[]).map(item =>
      fetchTeamDetails<NbaTeam>(item.$ref)
    )
  );
  return teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
