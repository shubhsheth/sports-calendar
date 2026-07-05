import { createFileRoute } from "@tanstack/react-router";
import SaveLeagueButton from "@/components/base/save-league-button";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { NflEvent, NflEventFilters } from "@sports-calendar/shared";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import DownloadIcalButton from "@/components/base/download-ical-button";
import NflEventCard from "@/components/nfl/nfl-event-card";
import NflFilterSelector from "@/components/nfl/nfl-filter-selector";
import { filterNflEvents } from "@sports-calendar/shared";
import { fetchNflEventRefs } from "@/components/nfl/utils/fetchNflEventRefs";
import { transformNflEventsToIcs } from "@sports-calendar/shared";
import { buildNflFeedUrl } from "@/components/nfl/utils/buildNflFeedUrl";
import { NflFilterPills } from "@/components/nfl/nfl-filter-pills";

export const Route = createFileRoute("/nfl")({
  component: NflPage,
  head: () => ({
    meta: [
      {
        title:
          "NFL Schedule - Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Stay up-to-date with the latest NFL schedule. Add events to your calendar with one click.",
      },
    ],
  }),
});

const NFL_LEAGUE = "nfl";
const NFL_SEASON_TYPE_IDS = [1, 2, 3];

function NflPage() {
  const [filters, setFilters] = useLocalStorageState<NflEventFilters>(
    "sports-calendar:nfl-filters",
    { showPastEvents: false, teamIds: [] }
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">NFL Schedule</h1>
        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
          <DownloadIcalButton<NflEvent, NflEventFilters>
            league={NFL_LEAGUE}
            seasonTypeIds={NFL_SEASON_TYPE_IDS}
            fetchEventRefsFn={fetchNflEventRefs}
            transformEventsToIcsFn={transformNflEventsToIcs}
            filterEvents={filterNflEvents}
            buildFeedUrlFn={buildNflFeedUrl}
            eventFilters={filters}
          />
          <SaveLeagueButton
            league="nfl"
            subscriptionFilters={{ teamIds: filters.teamIds }}
          />
          <NflFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <NflFilterPills filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          league={NFL_LEAGUE}
          seasonTypeIds={NFL_SEASON_TYPE_IDS}
          fetchEventRefsFn={fetchNflEventRefs}
          filters={filters}
          eventCard={NflEventCard}
        />
      </div>
    </div>
  );
}
