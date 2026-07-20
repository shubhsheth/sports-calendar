import posthog from "posthog-js";

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false, // handled manually via router subscription
    capture_pageleave: true,
  });
}

function capture(event: string, props?: Record<string, unknown>) {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.capture(event, props);
}

export const analytics = {
  pageView: (path: string) => capture("$pageview", { path }),
  leagueSelected: (league: string) => capture("league_selected", { league }),
  homeTabSelected: (tab: "leagues" | "teams") =>
    capture("home_tab_selected", { tab }),
  cricketTeamSelected: (teamId: string) =>
    capture("cricket_team_selected", {
      league: "cricket-team",
      team_id: teamId,
    }),
  filterPanelOpened: (league: string) =>
    capture("filter_panel_opened", { league }),
  filterShowPastEventsToggled: (league: string, enabled: boolean) =>
    capture("filter_show_past_events_toggled", { league, enabled }),
  filterTeamToggled: (
    league: string,
    teamId: string,
    action: "added" | "removed"
  ) => capture("filter_team_toggled", { league, team_id: teamId, action }),
  filterEventTypeToggled: (
    league: string,
    typeId: string,
    action: "added" | "removed"
  ) =>
    capture("filter_event_type_toggled", { league, type_id: typeId, action }),
  filterSelectAll: (league: string) =>
    capture("filter_select_all_clicked", { league }),
  filterCleared: (league: string) =>
    capture("filter_clear_clicked", { league }),
  filterPillRemoved: (league: string, filterType: string, label: string) =>
    capture("filter_pill_removed", {
      league,
      filter_type: filterType,
      label,
    }),
  calendarDownloadOpened: (league: string) =>
    capture("calendar_download_opened", { league }),
  calendarDownloaded: (league: string) =>
    capture("calendar_downloaded", { league }),
  calendarFeedUrlCopied: (league: string) =>
    capture("calendar_feed_url_copied", { league }),
  calendarFeedAppleClicked: (league: string) =>
    capture("calendar_feed_apple_clicked", { league }),
  calendarFeedGoogleClicked: (league: string) =>
    capture("calendar_feed_google_clicked", { league }),
  scheduleNextPageLoaded: (league: string, pageNumber: number) =>
    capture("schedule_next_page_loaded", { league, page_number: pageNumber }),
  signInStarted: (method: "google" | "magic_link") =>
    capture("sign_in_started", { method }),
  signedOut: () => capture("signed_out"),
  leagueSavedToMyCalendar: (league: string) =>
    capture("league_saved_to_my_calendar", { league }),
  leagueRemovedFromMyCalendar: (league: string) =>
    capture("league_removed_from_my_calendar", { league }),
  eventPinned: (league: string, eventId: string) =>
    capture("event_pinned", { league, event_id: eventId }),
  eventUnpinned: (league: string, eventId: string) =>
    capture("event_unpinned", { league, event_id: eventId }),
  feedTokenRegenerated: () => capture("feed_token_regenerated"),
};
