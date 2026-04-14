import { useQuery } from "@tanstack/react-query";
import type { IplEventFilters } from "@/types/ipl";
import { FilterPill } from "@/components/base/filter-pill";
import { fetchIplTeams } from "./utils/fetchIplTeams";
import {
  toggleShowPastEvents,
  toggleTeamFilter,
} from "./utils/filterIplEvents";
import { analytics } from "@/lib/analytics";

type IplFilterPillsProps = {
  filters: IplEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<IplEventFilters>>;
};

export function IplFilterPills({ filters, setFilters }: IplFilterPillsProps) {
  const { data: teams } = useQuery({
    queryKey: ["ipl", "teams"],
    queryFn: fetchIplTeams,
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
              "ipl",
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
          return (
            <FilterPill
              key={teamId}
              label={team.displayName}
              imgSrc={team.logo}
              onRemove={() => {
                analytics.filterPillRemoved("ipl", "team", team.displayName);
                toggleTeamFilter(teamId, filters, setFilters);
              }}
            />
          );
        })}
    </div>
  );
}
