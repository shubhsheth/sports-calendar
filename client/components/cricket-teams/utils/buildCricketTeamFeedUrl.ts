import type { CricketMatchFormat } from "@sports-calendar/shared";
import { buildCalendarFeedUrl } from "@/lib/buildCalendarFeedUrl";

/**
 * Builds the live, auto-updating `.ics` subscription feed URL for one cricket
 * team (`…/cricket-team/{teamId}.ics?formats=…`). The feed re-runs series
 * discovery on every poll, so newly announced series appear without user
 * action. Past events are always included by the live feed, matching the
 * other leagues.
 *
 * @param teamId - ESPN cricket team id (see `CRICKET_NATIONAL_TEAMS`).
 * @param formats - Format filter; empty means all formats.
 * @returns The subscription feed URL.
 */
export function buildCricketTeamFeedUrl(
  teamId: string,
  formats: CricketMatchFormat[]
): string {
  const params = new URLSearchParams();
  if (formats.length > 0) {
    params.set("formats", formats.join(","));
  }
  return buildCalendarFeedUrl(`cricket-team/${teamId}`, params);
}
