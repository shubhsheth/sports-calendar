import { createFileRoute } from "@tanstack/react-router";
import SaveLeagueButton from "@/components/base/save-league-button";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { NbaEvent, NbaEventFilters } from "@sports-calendar/shared";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import DownloadIcalButton from "@/components/base/download-ical-button";
import NbaEventCard from "@/components/nba/nba-event-card";
import NbaFilterSelector from "@/components/nba/nba-filter-selector";
import { fetchNbaEventRefs } from "@/components/nba/utils/fetchNbaEventRefs";
import { transformNbaEventsToIcs } from "@sports-calendar/shared";
import { filterNbaEvents } from "@sports-calendar/shared";
import { buildNbaFeedUrl } from "@/components/nba/utils/buildNbaFeedUrl";
import { NbaFilterPills } from "@/components/nba/nba-filter-pills";

export const Route = createFileRoute("/nba")({
  component: NbaPage,
  head: () => ({
    meta: [
      {
        title:
          "NBA Schedule - Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Stay up-to-date with the latest NBA schedule. Add events to your calendar with one click.",
      },
    ],
  }),
});

const NBA_LEAGUE = "nba";
const NBA_SEASON_TYPE_IDS = [1, 2, 5, 3];

function NbaPage() {
  const [filters, setFilters] = useLocalStorageState<NbaEventFilters>(
    "sports-calendar:nba-filters",
    { showPastEvents: false, teamIds: [] }
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">NBA Schedule</h1>
        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
          <DownloadIcalButton<NbaEvent, NbaEventFilters>
            league={NBA_LEAGUE}
            seasonTypeIds={NBA_SEASON_TYPE_IDS}
            fetchEventRefsFn={fetchNbaEventRefs}
            transformEventsToIcsFn={transformNbaEventsToIcs}
            filterEvents={filterNbaEvents}
            buildFeedUrlFn={buildNbaFeedUrl}
            eventFilters={filters}
          />
          <SaveLeagueButton
            league="nba"
            subscriptionFilters={{ teamIds: filters.teamIds }}
          />
          <NbaFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <NbaFilterPills filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          league={NBA_LEAGUE}
          seasonTypeIds={NBA_SEASON_TYPE_IDS}
          fetchEventRefsFn={fetchNbaEventRefs}
          filters={filters}
          eventCard={NbaEventCard}
        />
      </div>
    </div>
  );
}
