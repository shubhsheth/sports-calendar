/**
 * Fields common to every ESPN Core API event, regardless of sport. Per-league
 * event types (`shared/src/<league>/types.ts`) extend this with a sport-specific
 * `competitions` array.
 */
export type BaseEvent = {
  $ref: string;
  id: string;
  date: string; // ISO 8601 — the first/only competition's start time
  name: string; // e.g. "Los Angeles Lakers at Boston Celtics"
  shortName: string; // e.g. "LAL @ BOS"
  season: { $ref: string };
};

/**
 * Follows a Core API `$ref` stub and returns the full resource it points at.
 *
 * The Core API never inlines nested objects — it returns `{ $ref: URL }` stubs
 * that must be fetched separately. This is the generic follower for event refs;
 * `fetchTeamDetails` is the team-specific equivalent.
 *
 * The `http://` → `https://` rewrite is **required, not defensive**: ESPN
 * frequently returns `http://` in `$ref` URLs, which fails from an HTTPS page.
 *
 * @param refUrl - The `$ref` stub URL to follow.
 * @returns The full resource the stub points at, typed as `T`.
 */
export async function fetchEventDetails<T = BaseEvent>(
  refUrl: string
): Promise<T> {
  refUrl = refUrl.replace("http://", "https://");
  const response = await fetch(refUrl);
  const data = await response.json();
  return data as T;
}
