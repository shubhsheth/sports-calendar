-- Feature 004: cricket team calendars.
-- Adds the 'cricket-team' league to both user-data tables. Unlike league
-- subscriptions (one row per league), a user can follow several cricket teams,
-- so per-league uniqueness moves to (calendar_id, league, team_key) where
-- team_key is a stored generated column mirroring filters->>'teamId' — league
-- rows store no teamId, so their team_key is '' and one-row-per-league
-- semantics are preserved. A generated column + plain unique constraint
-- (rather than an expression index) keeps the target addressable by
-- PostgREST upserts (`on_conflict=calendar_id,league,team_key`).

alter table calendar_subscriptions
  drop constraint calendar_subscriptions_league_check;
alter table calendar_subscriptions
  add constraint calendar_subscriptions_league_check
  check (league in ('nba', 'nfl', 'f1', 'ipl', 'fifa', 'cricket-team'));

alter table calendar_pinned_events
  drop constraint calendar_pinned_events_league_check;
alter table calendar_pinned_events
  add constraint calendar_pinned_events_league_check
  check (league in ('nba', 'nfl', 'f1', 'ipl', 'fifa', 'cricket-team'));

-- 'cricket-team' subscriptions must carry the team they follow.
alter table calendar_subscriptions
  add constraint calendar_subscriptions_cricket_team_id_check
  check (league <> 'cricket-team' or filters->>'teamId' is not null);

alter table calendar_subscriptions
  add column team_key text generated always as (
    coalesce(filters->>'teamId', '')
  ) stored;

alter table calendar_subscriptions
  drop constraint calendar_subscriptions_calendar_id_league_key;
alter table calendar_subscriptions
  add constraint calendar_subscriptions_calendar_league_team_key
  unique (calendar_id, league, team_key);
