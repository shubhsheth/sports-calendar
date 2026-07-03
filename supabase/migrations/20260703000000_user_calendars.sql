-- Feature 003: user accounts & personal calendars.
-- One calendar per user, addressed externally by an unguessable feed token;
-- league subscriptions store the website's filter shapes as JSONB; pinned
-- events store only (league, espn_event_id) — ESPN stays the source of truth.

create table calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  feed_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table calendar_subscriptions (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references calendars (id) on delete cascade,
  league text not null check (league in ('nba', 'nfl', 'f1', 'ipl', 'fifa')),
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (calendar_id, league)
);

create table calendar_pinned_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references calendars (id) on delete cascade,
  league text not null check (league in ('nba', 'nfl', 'f1', 'ipl', 'fifa')),
  espn_event_id text not null,
  created_at timestamptz not null default now(),
  unique (calendar_id, league, espn_event_id)
);

alter table calendars enable row level security;
alter table calendar_subscriptions enable row level security;
alter table calendar_pinned_events enable row level security;

-- Owner-only access. No policies target the anon role, so anonymous clients
-- get nothing; the feed endpoint reads by token via the service role, which
-- bypasses RLS.

create policy "Users manage their own calendar"
  on calendars
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own subscriptions"
  on calendar_subscriptions
  for all
  to authenticated
  using (
    exists (
      select 1 from calendars
      where calendars.id = calendar_id
        and calendars.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from calendars
      where calendars.id = calendar_id
        and calendars.user_id = (select auth.uid())
    )
  );

create policy "Users manage their own pinned events"
  on calendar_pinned_events
  for all
  to authenticated
  using (
    exists (
      select 1 from calendars
      where calendars.id = calendar_id
        and calendars.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from calendars
      where calendars.id = calendar_id
        and calendars.user_id = (select auth.uid())
    )
  );
