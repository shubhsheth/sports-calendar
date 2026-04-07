import { useQuery } from "@tanstack/react-query";
import type { NflEventFilters } from "@/types/nfl";
import { FilterPill } from "@/components/base/filter-pill";
import { fetchNflTeams } from "./utils/fetchNflTeams";
import {
  toggleShowPastEvents,
  toggleTeamFilter,
} from "./utils/filterNflEvents";

type NflFilterPillsProps = {
  filters: NflEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<NflEventFilters>>;
};

export function NflFilterPills({ filters, setFilters }: NflFilterPillsProps) {
  const { data: teams } = useQuery({
    queryKey: ["nfl", "teams"],
    queryFn: fetchNflTeams,
    enabled: filters.teamIds.length > 0,
  });

  const hasActivePills = filters.showPastEvents || filters.teamIds.length > 0;
  if (!hasActivePills) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.showPastEvents && (
        <FilterPill
          label="Showing past events"
          onRemove={() => toggleShowPastEvents(filters, setFilters)}
        />
      )}
      {filters.teamIds.map((teamId) => {
        const team = teams?.find((t) => t.id === teamId);
        const label = team?.displayName ?? teamId;
        return (
          <FilterPill
            key={teamId}
            label={label}
            onRemove={() => toggleTeamFilter(teamId, filters, setFilters)}
          />
        );
      })}
    </div>
  );
}
