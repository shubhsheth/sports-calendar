import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { IplEventFilters } from "@sports-calendar/shared";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  toggleShowPastEvents,
  toggleTeamFilter,
} from "./utils/filterIplEvents";
import { fetchIplTeams } from "./utils/fetchIplTeams";
import { analytics } from "@/lib/analytics";

type IplFilterSelectorProps = {
  filters: IplEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<IplEventFilters>>;
};

function IplFilterSelector({ filters, setFilters }: IplFilterSelectorProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          onClick={() => analytics.filterPanelOpened("ipl")}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Events</SheetTitle>
        </SheetHeader>
        <div className="px-4 grid gap-6">
          <FieldSet>
            <FieldLegend>Past events</FieldLegend>
            <FieldDescription>
              Whether to show events that have already occurred
            </FieldDescription>
            <FieldGroup>
              <Field orientation="horizontal">
                <Checkbox
                  id="show-past-events"
                  checked={filters.showPastEvents}
                  onCheckedChange={() => {
                    analytics.filterShowPastEventsToggled(
                      "ipl",
                      !filters.showPastEvents
                    );
                    toggleShowPastEvents(filters, setFilters);
                  }}
                />
                <FieldLabel htmlFor="show-past-events">
                  Show past events
                </FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>

          <TeamFilterFieldSet filters={filters} setFilters={setFilters} />
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default IplFilterSelector;

function TeamFilterFieldSet({ filters, setFilters }: IplFilterSelectorProps) {
  const [teamSearch, setTeamSearch] = useState("");

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["ipl", "teams"],
    queryFn: fetchIplTeams,
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
            analytics.filterSelectAll("ipl");
            setFilters({ ...filters, teamIds: allTeamIds });
          }}
        >
          Select all
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            analytics.filterCleared("ipl");
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
        {filteredTeams.map(team => (
          <Field key={team.id} orientation="horizontal">
            <Checkbox
              id={`team-${team.id}`}
              checked={filters.teamIds.includes(team.id)}
              onCheckedChange={() => {
                analytics.filterTeamToggled(
                  "ipl",
                  team.id,
                  filters.teamIds.includes(team.id) ? "removed" : "added"
                );
                toggleTeamFilter(team.id, filters, setFilters);
              }}
            />
            <img
              src={team.logo}
              alt=""
              className="h-5 w-5 object-contain shrink-0"
            />
            <FieldLabel htmlFor={`team-${team.id}`}>
              {team.displayName}
            </FieldLabel>
          </Field>
        ))}
      </div>
    </FieldSet>
  );
}
