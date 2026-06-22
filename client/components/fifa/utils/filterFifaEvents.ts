import type { FifaEventFilters } from "@sports-calendar/shared";

export function toggleShowPastEvents(
  filters: FifaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<FifaEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: FifaEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<FifaEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
