/**
 * Service-role lookup of a personal calendar by its secret feed token.
 *
 * Talks to PostgREST directly with the service-role key (which bypasses RLS —
 * feed URLs are fetched by calendar apps that can't authenticate), so no
 * client library is needed. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
 * are provided automatically by the Edge Function runtime.
 */

export type StoredFilters = {
  teamIds?: unknown;
  types?: unknown;
};

export type PersonalCalendarData = {
  subscriptions: { league: string; filters: StoredFilters }[];
  pinnedEvents: { league: string; espnEventId: string }[];
};

type CalendarRow = {
  calendar_subscriptions: { league: string; filters: StoredFilters }[];
  calendar_pinned_events: { league: string; espn_event_id: string }[];
};

export async function fetchCalendarByToken(
  token: string
): Promise<PersonalCalendarData | null> {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!baseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  const select =
    "calendar_subscriptions(league,filters),calendar_pinned_events(league,espn_event_id)";
  const response = await fetch(
    `${baseUrl}/rest/v1/calendars?feed_token=eq.${token}&select=${select}`,
    {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Calendar lookup failed: ${response.status}`);
  }

  const rows = (await response.json()) as CalendarRow[];
  if (rows.length === 0) return null;

  return {
    subscriptions: rows[0].calendar_subscriptions,
    pinnedEvents: rows[0].calendar_pinned_events.map(row => ({
      league: row.league,
      espnEventId: row.espn_event_id,
    })),
  };
}
