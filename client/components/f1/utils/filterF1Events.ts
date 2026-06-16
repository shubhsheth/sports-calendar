import type { F1EventFilters } from "@sports-calendar/shared";

export function toggleShowPastEvents(
  filters: F1EventFilters,
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}

export function toggleEventType(
  type: string,
  filters: F1EventFilters,
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>
) {
  const types = filters.types.includes(type)
    ? filters.types.filter(t => t !== type)
    : [...filters.types, type];
  setFilters({ ...filters, types });
}
