import { createFileRoute } from "@tanstack/react-router";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { NbaEvent, NbaEventFilters } from "@/types/nba";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import DownloadIcalButton from "@/components/base/download-ical-button";
import NbaEventCard from "@/components/nba/nba-event-card";
import NbaFilterSelector from "@/components/nba/nba-filter-selector";
import {
  fetchNbaEventRefs,
  getNbaNextPageParam,
  NBA_SEASON_TYPES,
} from "@/components/nba/utils/fetchNbaEventRefs";
import { transformNbaEventsToIcs } from "@/components/nba/utils/transformNbaEventsToIcs";
import { filterNbaEvents } from "@/components/nba/utils/filterNbaEvents";
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

const NBA_BASE_QUERY_KEY = "nba";
const NBA_INITIAL_PAGE_PARAM = { seasonTypeIdx: 0, page: 1 };

const fetchNbaPage = (cursor: { seasonTypeIdx: number; page: number }) =>
  fetchNbaEventRefs(cursor.page, NBA_SEASON_TYPES[cursor.seasonTypeIdx].id);

function NbaPage() {
  const [filters, setFilters] = useLocalStorageState<NbaEventFilters>(
    "sports-calendar:nba-filters",
    { showPastEvents: true, teamIds: [] }
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex w-full justify-between mb-4">
        <h1 className="text-4xl font-extrabold tracking-tight">NBA Schedule</h1>
        <div className="flex gap-2">
          <DownloadIcalButton<NbaEvent, NbaEventFilters, typeof NBA_INITIAL_PAGE_PARAM>
            fetchEventRefsFn={fetchNbaPage}
            initialPageParam={NBA_INITIAL_PAGE_PARAM}
            getNextPageParamFn={getNbaNextPageParam}
            transformEventsToIcsFn={transformNbaEventsToIcs}
            filterEvents={filterNbaEvents}
            eventFilters={filters}
            baseQueryKey={NBA_BASE_QUERY_KEY}
          />
          <NbaFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <NbaFilterPills filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          baseQueryKey={NBA_BASE_QUERY_KEY}
          fetchEventRefsFn={fetchNbaPage}
          initialPageParam={NBA_INITIAL_PAGE_PARAM}
          getNextPageParamFn={getNbaNextPageParam}
          filters={filters}
          eventCard={NbaEventCard}
        />
      </div>
    </div>
  );
}
