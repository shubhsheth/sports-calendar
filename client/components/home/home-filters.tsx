import type { CricketMatchFormat } from "@sports-calendar/shared";
import { CRICKET_NATIONAL_TEAMS } from "@sports-calendar/shared";
import { Button } from "@/components/ui/button";
import {
  HOME_FORMAT_OPTIONS,
  HOME_LEAGUE_OPTIONS,
  type HomeLeague,
  type HomeSelection,
} from "./utils/selectionState";

type HomeFiltersProps = {
  selection: HomeSelection;
  onToggleTeam: (teamId: string) => void;
  onToggleLeague: (league: HomeLeague) => void;
  onToggleFormat: (format: CricketMatchFormat) => void;
};

function SelectableChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={selected ? "default" : "outline"}
      aria-pressed={selected}
      onClick={onClick}
      className="rounded-full"
    >
      {children}
    </Button>
  );
}

/**
 * The home page's Teams + Leagues multi-select chip rows. Cricket format
 * pills appear once at least one team is selected (they only apply to
 * cricket matches).
 */
export function HomeFilters({
  selection,
  onToggleTeam,
  onToggleLeague,
  onToggleFormat,
}: HomeFiltersProps) {
  return (
    <div className="grid gap-4 max-w-3xl mx-auto">
      <section aria-label="Teams">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Teams
        </h2>
        <div className="flex flex-wrap gap-2">
          {CRICKET_NATIONAL_TEAMS.map(team => (
            <SelectableChip
              key={team.id}
              selected={selection.teamIds.includes(team.id)}
              onClick={() => onToggleTeam(team.id)}
            >
              <img
                src={team.logo}
                alt=""
                className="size-4 object-contain shrink-0"
              />
              {team.name}
            </SelectableChip>
          ))}
        </div>
      </section>

      <section aria-label="Leagues">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Leagues
        </h2>
        <div className="flex flex-wrap gap-2">
          {HOME_LEAGUE_OPTIONS.map(league => (
            <SelectableChip
              key={league.id}
              selected={selection.leagues.includes(league.id)}
              onClick={() => onToggleLeague(league.id)}
            >
              {league.label}
            </SelectableChip>
          ))}
        </div>
      </section>

      {selection.teamIds.length > 0 && (
        <section aria-label="Cricket formats">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Cricket formats
          </h2>
          <div className="flex flex-wrap gap-2">
            {HOME_FORMAT_OPTIONS.map(format => (
              <SelectableChip
                key={format.id}
                selected={selection.formats.includes(format.id)}
                onClick={() => onToggleFormat(format.id)}
              >
                {format.label}
              </SelectableChip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
