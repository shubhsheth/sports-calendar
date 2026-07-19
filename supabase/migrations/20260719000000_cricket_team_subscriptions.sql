-- Feature 004: cricket team calendars.
-- Adds the 'cricket-team' league to both user-data tables. Unlike league
-- subscriptions (one row per league), a user can follow several cricket teams,
-- so per-league uniqueness moves to a unique index keyed on the subscription's
-- filters->>'teamId' — league rows store no teamId, so coalesce('') preserves
-- their one-row-per-league semantics.

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
  drop constraint calendar_subscriptions_calendar_id_league_key;
create unique index calendar_subscriptions_calendar_league_team_key
  on calendar_subscriptions (
    calendar_id,
    league,
    coalesce(filters->>'teamId', '')
  );
