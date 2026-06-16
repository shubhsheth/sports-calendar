import type { IplEventFilters } from "@sports-calendar/shared";

export function toggleShowPastEvents(
  filters: IplEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<IplEventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleTeamFilter(
  teamId: string,
  filters: IplEventFilters,
  setFilters: React.Dispatch<React.SetStateAction<IplEventFilters>>
) {
  const teamIds = filters.teamIds.includes(teamId)
    ? filters.teamIds.filter(id => id !== teamId)
    : [...filters.teamIds, teamId];
  setFilters({ ...filters, teamIds });
}
