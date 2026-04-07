import type { F1EventFilters } from "@/types/f1";
import { FilterPill } from "@/components/base/filter-pill";
import { translateF1EventTypeId } from "./utils/translateF1EventType";

const ALL_F1_TYPES = ["1", "2", "3", "4", "6"];

type F1FilterPillsProps = {
  filters: F1EventFilters;
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>;
};

export function F1FilterPills({ filters, setFilters }: F1FilterPillsProps) {
  const hiddenTypes = ALL_F1_TYPES.filter((t) => !filters.types.includes(t));
  const hasActivePills = filters.showPastEvents || hiddenTypes.length > 0;
  if (!hasActivePills) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.showPastEvents && (
        <FilterPill
          label="Showing past events"
          onRemove={() => setFilters({ ...filters, showPastEvents: false })}
        />
      )}
      {hiddenTypes.map((typeId) => (
        <FilterPill
          key={typeId}
          label={translateF1EventTypeId(typeId)}
          onRemove={() =>
            setFilters({ ...filters, types: [...filters.types, typeId] })
          }
        />
      ))}
    </div>
  );
}
