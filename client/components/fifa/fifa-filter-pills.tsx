import { useQuery } from "@tanstack/react-query";
import type { FifaEventFilters } from "@sports-calendar/shared";
import { FilterPill } from "@/components/base/filter-pill";
import { fetchFifaTeams } from "./utils/fetchFifaTeams";
import {
  toggleShowPastEvents,
  toggleTeamFilter,
} from "./utils/filterFifaEvents";
import { analytics } from "@/lib/analytics";

type FifaFilterPillsProps = {
  filters: FifaEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<FifaEventFilters>>;
};

export function FifaFilterPills({ filters, setFilters }: FifaFilterPillsProps) {
  const { data: teams } = useQuery({
    queryKey: ["fifa", "teams"],
    queryFn: fetchFifaTeams,
    enabled: filters.teamIds.length > 0,
  });

  const hasActivePills = filters.showPastEvents || filters.teamIds.length > 0;
  if (!hasActivePills) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.showPastEvents && (
        <FilterPill
          label="Show past events"
          onRemove={() => {
            analytics.filterPillRemoved(
              "fifa",
              "show_past_events",
              "Show past events"
            );
            toggleShowPastEvents(filters, setFilters);
          }}
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
              onRemove={() => {
                analytics.filterPillRemoved("fifa", "team", team.displayName);
                toggleTeamFilter(teamId, filters, setFilters);
              }}
            />
          );
        })}
    </div>
  );
}
