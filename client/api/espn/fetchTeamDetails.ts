// BaseTeam is frontend-only: team-detail fetching isn't used by the calendar
// ICS feeds, so this type isn't part of @sports-calendar/shared.
type BaseTeam = {
  $ref: string;
  id: string;
  name: string;
  displayName: string;
};

export async function fetchTeamDetails<T = BaseTeam>(
  refUrl: string
): Promise<T> {
  refUrl = refUrl.replace("http://", "https://");
  const response = await fetch(refUrl);
  const data = await response.json();
  return data as T;
}
