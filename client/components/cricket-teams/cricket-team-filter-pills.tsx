import type { CricketTeamFilters } from "@sports-calendar/shared";
import { FilterPill } from "@/components/base/filter-pill";
import { analytics } from "@/lib/analytics";
import {
  CRICKET_FORMAT_OPTIONS,
  toggleFormatFilter,
  toggleShowPastEvents,
} from "./utils/filterState";

type CricketTeamFilterPillsProps = {
  filters: CricketTeamFilters;
  setFilters: React.Dispatch<React.SetStateAction<CricketTeamFilters>>;
};

/** Removable pills summarizing the active team-page filters. */
export function CricketTeamFilterPills({
  filters,
  setFilters,
}: CricketTeamFilterPillsProps) {
  const hasActivePills = filters.showPastEvents || filters.formats.length > 0;
  if (!hasActivePills) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.showPastEvents && (
        <FilterPill
          label="Show past events"
          onRemove={() => {
            analytics.filterPillRemoved(
              "cricket-team",
              "show_past_events",
              "Show past events"
            );
            toggleShowPastEvents(filters, setFilters);
          }}
        />
      )}
      {filters.formats.map(format => {
        const label =
          CRICKET_FORMAT_OPTIONS.find(o => o.id === format)?.label ?? format;
        return (
          <FilterPill
            key={format}
            label={label}
            onRemove={() => {
              analytics.filterPillRemoved("cricket-team", "format", label);
              toggleFormatFilter(format, filters, setFilters);
            }}
          />
        );
      })}
    </div>
  );
}
