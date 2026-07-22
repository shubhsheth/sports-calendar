import { Link } from "@tanstack/react-router";
import { CRICKET_NATIONAL_TEAMS } from "@sports-calendar/shared";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import type { HomeSection, HomeSections } from "./utils/homeSections";

type HomeSectionToggleProps = {
  sections: HomeSections;
  onToggle: (section: HomeSection) => void;
};

/**
 * A single segmented pill — Leagues on the left, Teams on the right — where
 * each half toggles independently, so the user can show one grid or both.
 */
export function HomeSectionToggle({
  sections,
  onToggle,
}: HomeSectionToggleProps) {
  const toggle = (section: HomeSection) => {
    analytics.homeSectionToggled(section, !sections[section]);
    onToggle(section);
  };
  const segment = (section: HomeSection, label: string) => (
    <button
      type="button"
      aria-pressed={sections[section]}
      onClick={() => toggle(section)}
      className={cn(
        "rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
        sections[section]
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex w-fit rounded-full border p-0.5"
      role="group"
      aria-label="Browse by"
    >
      {segment("leagues", "Leagues")}
      {segment("teams", "Teams")}
    </div>
  );
}

/** The Teams grid: 12 national sides, styled like the league tiles. */
export function TeamTileGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-3xl mx-auto">
      {CRICKET_NATIONAL_TEAMS.map(team => (
        <Link
          key={team.id}
          to="/cricket-teams/$teamId"
          params={{ teamId: team.id }}
          className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100 flex flex-col items-center gap-3"
          onClick={() => analytics.cricketTeamSelected(team.id)}
        >
          <img
            src={team.logo}
            alt=""
            className="h-10 w-10 object-contain"
            loading="lazy"
          />
          {team.name}
        </Link>
      ))}
    </div>
  );
}
