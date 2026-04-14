import type { F1EventFilters } from "@/types/f1";
import { FilterPill } from "@/components/base/filter-pill";
import { translateF1EventTypeId } from "./utils/translateF1EventType";
import { toggleEventType, toggleShowPastEvents } from "./utils/filterF1Events";
import { analytics } from "@/lib/analytics";

type F1FilterPillsProps = {
  filters: F1EventFilters;
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>;
};

export function F1FilterPills({ filters, setFilters }: F1FilterPillsProps) {
  const hasActivePills = filters.showPastEvents || filters.types.length > 0;
  if (!hasActivePills) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.showPastEvents && (
        <FilterPill
          label="Show past events"
          onRemove={() => {
            analytics.filterPillRemoved("f1", "show_past_events", "Show past events");
            toggleShowPastEvents(filters, setFilters);
          }}
        />
      )}
      {filters.types.map(typeId => (
        <FilterPill
          key={typeId}
          label={translateF1EventTypeId(typeId)}
          onRemove={() => {
            analytics.filterPillRemoved("f1", "event_type", translateF1EventTypeId(typeId));
            toggleEventType(typeId, filters, setFilters);
          }}
        />
      ))}
    </div>
  );
}
