// BaseTeam is frontend-only: team-detail fetching isn't used by the calendar
// ICS feeds, so this type isn't part of @sports-calendar/shared.
type BaseTeam = {
  $ref: string;
  id: string;
  name: string;
  displayName: string;
};

/**
 * Follows a `competitor.team.$ref` stub and returns the full team resource
 * (including the `logos[]` array). Used only by NBA/NFL cards — F1 has no
 * competitor/team data, and IPL embeds team info inline. Team logos carry `rel`
 * tags (`"default"` for light backgrounds, `"dark"` for dark); cards pick
 * `"default"`.
 *
 * The `http://` → `https://` rewrite is required for the same reason as
 * `fetchEventDetails` — ESPN returns `http://` in `$ref` URLs.
 */
export async function fetchTeamDetails<T = BaseTeam>(
  refUrl: string
): Promise<T> {
  refUrl = refUrl.replace("http://", "https://");
  const response = await fetch(refUrl);
  const data = await response.json();
  return data as T;
}
