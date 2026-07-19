import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { analytics } from "@/lib/analytics";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { HomeFilters } from "@/components/home/home-filters";
import { CombinedSchedule } from "@/components/home/combined-schedule";
import { SelectionCalendarLinks } from "@/components/home/selection-calendar-links";
import { useCombinedSchedule } from "@/components/home/utils/useCombinedSchedule";
import {
  EMPTY_HOME_SELECTION,
  HOME_SELECTION_STORAGE_KEY,
  hasSelection,
  normalizeSelection,
  toggleFormat,
  toggleLeague,
  toggleTeam,
  type HomeSelection,
} from "@/components/home/utils/selectionState";

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
  const [storedSelection, setStoredSelection] =
    useLocalStorageState<HomeSelection>(
      HOME_SELECTION_STORAGE_KEY,
      EMPTY_HOME_SELECTION
    );
  const selection = normalizeSelection(storedSelection);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const { entries, isLoading, failedSources } = useCombinedSchedule(
    selection,
    showPastEvents
  );
  const selectionActive = hasSelection(selection);

  return (
    <div className="grid gap-6">
      <HomeFilters
        selection={selection}
        onToggleTeam={teamId =>
          setStoredSelection(toggleTeam(selection, teamId))
        }
        onToggleLeague={league =>
          setStoredSelection(toggleLeague(selection, league))
        }
        onToggleFormat={format =>
          setStoredSelection(toggleFormat(selection, format))
        }
      />
      {selectionActive && (
        <>
          <SelectionCalendarLinks selection={selection} entries={entries} />
          <CombinedSchedule
            entries={entries}
            isLoading={isLoading}
            failedSources={failedSources}
            showPastEvents={showPastEvents}
            onToggleShowPast={setShowPastEvents}
          />
        </>
      )}
      <NavigationGrid />
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
