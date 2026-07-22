import { supabase } from "@/lib/supabase";
import type {
  League,
  MyCalendar,
  PinnedEvent,
  SubscriptionFilters,
} from "./types";

/**
 * CRUD for the signed-in user's personal calendar. All calls go straight to
 * Postgres through supabase-js; RLS scopes every query to the current user,
 * so no filters on user identity are needed here.
 */

type CalendarRow = { id: string; feed_token: string };

type CalendarWithChildrenRow = CalendarRow & {
  calendar_subscriptions: { league: League; filters: SubscriptionFilters }[];
  calendar_pinned_events: { league: League; espn_event_id: string }[];
};

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function requireUserId(): Promise<string> {
  const { data } = await requireClient().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

/** The user's calendar row, created on first use. */
export async function getOrCreateCalendar(): Promise<{
  id: string;
  feedToken: string;
}> {
  const client = requireClient();
  const userId = await requireUserId();

  const existing = await client
    .from("calendars")
    .select("id, feed_token")
    .maybeSingle<CalendarRow>();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    return { id: existing.data.id, feedToken: existing.data.feed_token };
  }

  const created = await client
    .from("calendars")
    .insert({ user_id: userId })
    .select("id, feed_token")
    .single<CalendarRow>();
  if (created.error) throw new Error(created.error.message);
  return { id: created.data.id, feedToken: created.data.feed_token };
}

/** The full calendar (subscriptions + pinned events), or null before first use. */
export async function listCalendar(): Promise<MyCalendar | null> {
  const client = requireClient();
  await requireUserId();

  const { data, error } = await client
    .from("calendars")
    .select(
      "id, feed_token, calendar_subscriptions(league, filters), calendar_pinned_events(league, espn_event_id)"
    )
    .maybeSingle<CalendarWithChildrenRow>();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    feedToken: data.feed_token,
    subscriptions: data.calendar_subscriptions.map(row => ({
      league: row.league,
      filters: row.filters,
    })),
    pinnedEvents: data.calendar_pinned_events.map(row => ({
      league: row.league,
      espnEventId: row.espn_event_id,
    })),
  };
}

/**
 * Add the subscription, or replace its stored filters if already present.
 * The conflict target includes `team_key` (a generated column mirroring
 * `filters->>'teamId'`), so leagues stay one-row-per-league while each
 * followed cricket team gets its own row.
 */
export async function upsertSubscription(
  league: League,
  filters: SubscriptionFilters
): Promise<void> {
  const client = requireClient();
  const calendar = await getOrCreateCalendar();

  const { error } = await client
    .from("calendar_subscriptions")
    .upsert(
      { calendar_id: calendar.id, league, filters },
      { onConflict: "calendar_id,league,team_key" }
    );
  if (error) throw new Error(error.message);
}

/**
 * Remove a subscription. `teamId` narrows the delete to one followed cricket
 * team; without it every row of the league goes (leagues have one anyway).
 */
export async function removeSubscription(
  league: League,
  teamId?: string
): Promise<void> {
  const client = requireClient();
  await requireUserId();

  let query = client
    .from("calendar_subscriptions")
    .delete()
    .eq("league", league);
  if (teamId !== undefined) query = query.eq("team_key", teamId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function pinEvent(
  league: League,
  espnEventId: string
): Promise<void> {
  const client = requireClient();
  const calendar = await getOrCreateCalendar();

  const { error } = await client.from("calendar_pinned_events").upsert(
    { calendar_id: calendar.id, league, espn_event_id: espnEventId },
    {
      onConflict: "calendar_id,league,espn_event_id",
      ignoreDuplicates: true,
    }
  );
  if (error) throw new Error(error.message);
}

export async function unpinEvent(
  league: League,
  espnEventId: string
): Promise<void> {
  const client = requireClient();
  await requireUserId();

  const { error } = await client
    .from("calendar_pinned_events")
    .delete()
    .eq("league", league)
    .eq("espn_event_id", espnEventId);
  if (error) throw new Error(error.message);
}

/** Rotate the feed token, invalidating the previous feed URL. */
export async function regenerateFeedToken(): Promise<string> {
  const client = requireClient();
  const calendar = await getOrCreateCalendar();

  const { data, error } = await client
    .from("calendars")
    .update({ feed_token: crypto.randomUUID() })
    .eq("id", calendar.id)
    .select("feed_token")
    .single<Pick<CalendarRow, "feed_token">>();
  if (error) throw new Error(error.message);
  return data.feed_token;
}

export type { League, MyCalendar, PinnedEvent, SubscriptionFilters };
