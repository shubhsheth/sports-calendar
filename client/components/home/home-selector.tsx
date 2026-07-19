import { Link } from "@tanstack/react-router";
import { CRICKET_NATIONAL_TEAMS } from "@sports-calendar/shared";
import { Button } from "@/components/ui/button";
import type { HomeTab } from "./utils/homeTab";

type HomeTabSelectorProps = {
  tab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
};

/**
 * The home page's segmented Leagues | Teams control. Which tile grid renders
 * below is the route's concern — this is just the switch.
 */
export function HomeTabSelector({ tab, onTabChange }: HomeTabSelectorProps) {
  return (
    <div
      className="flex justify-center gap-2"
      role="group"
      aria-label="Browse by"
    >
      <Button
        size="sm"
        variant={tab === "leagues" ? "default" : "outline"}
        aria-pressed={tab === "leagues"}
        className="rounded-full"
        onClick={() => onTabChange("leagues")}
      >
        Leagues
      </Button>
      <Button
        size="sm"
        variant={tab === "teams" ? "default" : "outline"}
        aria-pressed={tab === "teams"}
        className="rounded-full"
        onClick={() => onTabChange("teams")}
      >
        Teams
      </Button>
    </div>
  );
}

/** The Teams tab's tile grid: 12 national sides, styled like the league tiles. */
export function TeamTileGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-3xl mx-auto">
      {CRICKET_NATIONAL_TEAMS.map(team => (
        <Link
          key={team.id}
          to="/cricket-teams/$teamId"
          params={{ teamId: team.id }}
          className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100 flex flex-col items-center gap-3"
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
