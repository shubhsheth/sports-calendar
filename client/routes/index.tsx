import { createFileRoute, Link } from "@tanstack/react-router";
import { analytics } from "@/lib/analytics";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import {
  HomeSectionToggle,
  TeamTileGrid,
} from "@/components/home/home-selector";
import {
  DEFAULT_HOME_SECTIONS,
  HOME_SECTIONS_STORAGE_KEY,
  normalizeHomeSections,
  type HomeSection,
  type HomeSections,
} from "@/components/home/utils/homeSections";

export const Route = createFileRoute("/")({
  component: IndexComponent,
  head: () => ({
    meta: [
      {
        title:
          "Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Sports Calendar is your go-to destination for viewing schedules of your favorite sports in one convenient place. Stay up-to-date with the latest game times, matchups, and events across various sports leagues. Whether you're a fan of basketball, football, soccer, or any other sport, Sports Calendar has you covered with an easy-to-use interface and comprehensive schedule information.",
      },
    ],
  }),
});

function IndexComponent() {
  const [stored, setStored] = useLocalStorageState<HomeSections>(
    HOME_SECTIONS_STORAGE_KEY,
    DEFAULT_HOME_SECTIONS
  );
  const sections = normalizeHomeSections(stored);
  const toggle = (section: HomeSection) =>
    setStored({ ...sections, [section]: !sections[section] });

  return (
    <div className="grid gap-6">
      <HomeSectionToggle sections={sections} onToggle={toggle} />
      {sections.leagues && <NavigationGrid />}
      {sections.teams && <TeamTileGrid />}
      {!sections.leagues && !sections.teams && (
        <p className="text-sm text-muted-foreground text-center">
          Select Leagues or Teams to browse.
        </p>
      )}
    </div>
  );
}

function NavigationGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-3xl mx-auto">
      <Link
        to="/nba"
        className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100"
        onClick={() => analytics.leagueSelected("nba")}
      >
        View NBA Schedule
      </Link>
      <Link
        to="/f1"
        className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100"
        onClick={() => analytics.leagueSelected("f1")}
      >
        View F1 Schedule
      </Link>
      <Link
        to="/nfl"
        className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100"
        onClick={() => analytics.leagueSelected("nfl")}
      >
        View NFL Schedule
      </Link>
      <Link
        to="/ipl"
        className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100"
        onClick={() => analytics.leagueSelected("ipl")}
      >
        View IPL Schedule
      </Link>
      <Link
        to="/fifa"
        className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100"
        onClick={() => analytics.leagueSelected("fifa")}
      >
        View FIFA World Cup Schedule
      </Link>
    </div>
  );
}
