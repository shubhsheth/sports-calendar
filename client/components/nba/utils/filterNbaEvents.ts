import type { NbaEventFilters } from "@sports-calendar/shared";

export function toggleShowPastEvents(
  filters: NbaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NbaEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: NbaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<NbaEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
