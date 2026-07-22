import type {
  CricketMatchFormat,
  CricketTeamFilters,
} from "@sports-calendar/shared";

export const CRICKET_FORMAT_OPTIONS: Array<{
  id: CricketMatchFormat;
  label: string;
}> = [
  { id: "test", label: "Test" },
  { id: "odi", label: "ODI" },
  { id: "t20i", label: "T20I" },
  { id: "other", label: "Other" },
];

export function toggleFormatFilter(
  format: CricketMatchFormat,
  filters: CricketTeamFilters,
  setFilters: React.Dispatch<React.SetStateAction<CricketTeamFilters>>
) {
  setFilters({
    ...filters,
    formats: filters.formats.includes(format)
      ? filters.formats.filter(f => f !== format)
      : [...filters.formats, format],
  });
}

export function toggleShowPastEvents(
  filters: CricketTeamFilters,
  setFilters: React.Dispatch<React.SetStateAction<CricketTeamFilters>>
) {
  setFilters({ ...filters, showPastEvents: !filters.showPastEvents });
}
