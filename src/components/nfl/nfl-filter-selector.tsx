import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {NflEventFilters} from '@/types/nfl';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {Input} from '../ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '../ui/field';
import {toggleShowPastEvents, toggleTeamFilter} from './utils/filterNflEvents';
import {fetchNflTeams} from './utils/fetchNflTeams';

type NflFilterSelectorProps = {
  filters: NflEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<NflEventFilters>>;
};

function NflFilterSelector({filters, setFilters}: NflFilterSelectorProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Filter</Button>
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
              <Field orientation={'horizontal'}>
                <Checkbox
                  id="show-past-events"
                  checked={filters.showPastEvents}
                  onCheckedChange={() =>
                    toggleShowPastEvents(filters, setFilters)
                  }
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

export default NflFilterSelector;

function TeamFilterFieldSet({filters, setFilters}: NflFilterSelectorProps) {
  const [teamSearch, setTeamSearch] = useState('');

  const {data: teams, isLoading: teamsLoading} = useQuery({
    queryKey: ['nfl', 'teams'],
    queryFn: fetchNflTeams,
  });

  const filteredTeams = (teams ?? []).filter(team =>
    team.displayName.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const allTeamIds = teams?.map(t => t.id) ?? [];

  return (
    <FieldSet>
      <FieldLegend>Teams</FieldLegend>
      <FieldDescription>
        Show only games featuring selected teams. No selection shows all.
      </FieldDescription>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={teamsLoading}
          onClick={() => setFilters({...filters, teamIds: allTeamIds})}
        >
          Select all
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFilters({...filters, teamIds: []})}
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
          const logo = team.logos?.find(l => l.rel.includes('default'));
          return (
            <Field key={team.id} orientation="horizontal">
              <Checkbox
                id={`team-${team.id}`}
                checked={filters.teamIds.includes(team.id)}
                onCheckedChange={() =>
                  toggleTeamFilter(team.id, filters, setFilters)
                }
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
