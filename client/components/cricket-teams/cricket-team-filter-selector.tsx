import type { CricketTeamFilters } from "@sports-calendar/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CRICKET_FORMAT_OPTIONS,
  toggleFormatFilter,
  toggleShowPastEvents,
} from "./utils/filterState";

type CricketTeamFilterSelectorProps = {
  filters: CricketTeamFilters;
  setFilters: React.Dispatch<React.SetStateAction<CricketTeamFilters>>;
};

/**
 * The team page's filters: format pills (empty selection = all formats) and
 * the standard show-past-events toggle.
 */
export function CricketTeamFilterSelector({
  filters,
  setFilters,
}: CricketTeamFilterSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Match formats"
      >
        {CRICKET_FORMAT_OPTIONS.map(format => (
          <Button
            key={format.id}
            size="sm"
            variant={
              filters.formats.includes(format.id) ? "default" : "outline"
            }
            aria-pressed={filters.formats.includes(format.id)}
            className="rounded-full"
            onClick={() => toggleFormatFilter(format.id, filters, setFilters)}
          >
            {format.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="show-past-events"
          checked={filters.showPastEvents}
          onCheckedChange={() => toggleShowPastEvents(filters, setFilters)}
        />
        <label htmlFor="show-past-events" className="text-sm">
          Show past events
        </label>
      </div>
    </div>
  );
}
