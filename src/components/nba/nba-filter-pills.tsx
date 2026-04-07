import { useQuery } from "@tanstack/react-query";
import type { NbaEventFilters } from "@/types/nba";
import { FilterPill } from "@/components/base/filter-pill";
import { fetchNbaTeams } from "./utils/fetchNbaTeams";

type NbaFilterPillsProps = {
  filters: NbaEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<NbaEventFilters>>;
};

export function NbaFilterPills({ filters, setFilters }: NbaFilterPillsProps) {
  const { data: teams } = useQuery({
    queryKey: ["nba", "teams"],
    queryFn: fetchNbaTeams,
    enabled: filters.teamIds.length > 0,
  });

  const hasActivePills = filters.showPastEvents || filters.teamIds.length > 0;
  if (!hasActivePills) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.showPastEvents && (
        <FilterPill
          label="Showing past events"
          onRemove={() => setFilters({ ...filters, showPastEvents: false })}
        />
      )}
      {filters.teamIds.map((teamId) => {
        const team = teams?.find((t) => t.id === teamId);
        const label = team?.displayName ?? teamId;
        return (
          <FilterPill
            key={teamId}
            label={label}
            onRemove={() =>
              setFilters({
                ...filters,
                teamIds: filters.teamIds.filter((id) => id !== teamId),
              })
            }
          />
        );
      })}
    </div>
  );
}
