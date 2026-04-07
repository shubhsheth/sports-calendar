import type { F1EventFilters } from "@/types/f1";
import { FilterPill } from "@/components/base/filter-pill";
import { translateF1EventTypeId } from "./utils/translateF1EventType";
import {
  toggleEventType,
  toggleShowPastEvents,
} from "./utils/filterF1Events";

const ALL_F1_TYPES = ["1", "2", "3", "4", "6"];

type F1FilterPillsProps = {
  filters: F1EventFilters;
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>;
};

export function F1FilterPills({ filters, setFilters }: F1FilterPillsProps) {
  // Types from ALL_F1_TYPES that are not included in the current filter
  const excludedTypes = ALL_F1_TYPES.filter((t) => !filters.types.includes(t));
  const hasActivePills = filters.showPastEvents || excludedTypes.length > 0;
  if (!hasActivePills) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.showPastEvents && (
        <FilterPill
          label="Showing past events"
          onRemove={() => toggleShowPastEvents(filters, setFilters)}
        />
      )}
      {excludedTypes.map((typeId) => (
        <FilterPill
          key={typeId}
          label={translateF1EventTypeId(typeId)}
          onRemove={() => toggleEventType(typeId, filters, setFilters)}
        />
      ))}
    </div>
  );
}
