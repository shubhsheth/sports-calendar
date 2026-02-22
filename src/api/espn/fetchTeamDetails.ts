import type { BaseTeam } from "../../types/base";

export async function fetchTeamDetails<T = BaseTeam>(
  refUrl: string,
): Promise<T> {
  const response = await fetch(refUrl);
  const data = await response.json();
  return data as T;
}
