import type { NflEventFilters } from "@sports-calendar/shared";

export function toggleShowPastEvents(
  filters: NflEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NflEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: NflEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NflEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
