import { useQuery } from "@tanstack/react-query";
import type { NbaEventFilters } from "@/types/nba";
import { FilterPill } from "@/components/base/filter-pill";
import { fetchNbaTeams } from "./utils/fetchNbaTeams";
import {
  toggleShowPastEvents,
  toggleTeamFilter,
} from "./utils/filterNbaEvents";

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
          label="Show past events"
          onRemove={() => toggleShowPastEvents(filters, setFilters)}
        />
      )}
      {teams &&
        filters.teamIds.map(teamId => {
          const team = teams.find(t => t.id === teamId);
          if (!team) return null;
          const logo = team.logos?.find(l => l.rel.includes("default"));
          return (
            <FilterPill
              key={teamId}
              label={team.displayName}
              imgSrc={logo?.href}
              onRemove={() => toggleTeamFilter(teamId, filters, setFilters)}
            />
          );
        })}
    </div>
  );
}
