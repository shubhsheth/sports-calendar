import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FifaEventFilters } from "@sports-calendar/shared";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../ui/field";
import { toggleTeamFilter } from "./utils/filterFifaEvents";
import { fetchFifaTeams } from "./utils/fetchFifaTeams";
import { analytics } from "@/lib/analytics";

type TeamFilterFieldSetProps = {
  filters: FifaEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<FifaEventFilters>>;
};

export function TeamFilterFieldSet({
  filters,
  setFilters,
}: TeamFilterFieldSetProps) {
  const [teamSearch, setTeamSearch] = useState("");

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["fifa", "teams"],
    queryFn: fetchFifaTeams,
  });

  const filteredTeams = (teams ?? []).filter(team =>
    team.displayName.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const allTeamIds = teams?.map(t => t.id) ?? [];

  return (
    <FieldSet>
      <FieldLegend>Teams</FieldLegend>
      <FieldDescription>
        Show only matches featuring selected teams. No selection shows all.
      </FieldDescription>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={teamsLoading}
          onClick={() => {
            analytics.filterSelectAll("fifa");
            setFilters({ ...filters, teamIds: allTeamIds });
          }}
        >
          Select all
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            analytics.filterCleared("fifa");
            setFilters({ ...filters, teamIds: [] });
          }}
        >
          Clear
        </Button>
      </div>
      <Input
        placeholder="Search teams..."
        value={teamSearch}
        onChange={e => setTeamSearch(e.target.value)}
      />
      <div className="max-h-72 overflow-y-auto space-y-1">
        {teamsLoading && (
          <p className="text-sm text-muted-foreground py-2">Loading teams...</p>
        )}
        {filteredTeams.map(team => {
          const logo = team.logos?.find(l => l.rel.includes("default"));
          return (
            <Field key={team.id} orientation="horizontal">
              <Checkbox
                id={`team-${team.id}`}
                checked={filters.teamIds.includes(team.id)}
                onCheckedChange={() => {
                  analytics.filterTeamToggled(
                    "fifa",
                    team.id,
                    filters.teamIds.includes(team.id) ? "removed" : "added"
                  );
                  toggleTeamFilter(team.id, filters, setFilters);
                }}
              />
              {logo && (
                <img
                  src={logo.href}
                  alt=""
                  className="h-5 w-5 object-contain shrink-0"
                />
              )}
              <FieldLabel htmlFor={`team-${team.id}`}>
                {team.displayName}
              </FieldLabel>
            </Field>
          );
        })}
      </div>
    </FieldSet>
  );
}
