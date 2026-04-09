import { createFileRoute } from "@tanstack/react-router";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { NflEvent, NflEventFilters } from "@/types/nfl";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import DownloadIcalButton from "@/components/base/download-ical-button";
import NbaEventCard from "@/components/nba/nba-event-card";
import NflFilterSelector from "@/components/nfl/nfl-filter-selector";
import { filterNflEvents } from "@/components/nfl/utils/filterNflEvents";
import {
  fetchNflEventRefs,
  getNflNextPageParam,
} from "@/components/nfl/utils/fetchNflEventRefs";
import { transformNflEventsToIcs } from "@/components/nfl/utils/transformNflEventsToIcs";
import { NflFilterPills } from "@/components/nfl/nfl-filter-pills";
import type { SeasonCursor } from "@/api/espn/fetchEventRefs";

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

const NFL_BASE_QUERY_KEY = "nfl";
const NFL_INITIAL_PAGE_PARAM: SeasonCursor = { seasonTypeIdx: 0, page: 1 };

function NflPage() {
  const [filters, setFilters] = useLocalStorageState<NflEventFilters>(
    "sports-calendar:nfl-filters",
    { showPastEvents: true, teamIds: [] }
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex w-full justify-between mb-4">
        <h1 className="text-4xl font-extrabold tracking-tight">NFL Schedule</h1>
        <div className="flex gap-2">
          <DownloadIcalButton<NflEvent, NflEventFilters, SeasonCursor>
            fetchEventRefsFn={fetchNflEventRefs}
            initialPageParam={NFL_INITIAL_PAGE_PARAM}
            getNextPageParamFn={getNflNextPageParam}
            transformEventsToIcsFn={transformNflEventsToIcs}
            filterEvents={filterNflEvents}
            eventFilters={filters}
            baseQueryKey={NFL_BASE_QUERY_KEY}
          />
          <NflFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <NflFilterPills filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents<SeasonCursor>
          baseQueryKey={NFL_BASE_QUERY_KEY}
          fetchEventRefsFn={fetchNflEventRefs}
          initialPageParam={NFL_INITIAL_PAGE_PARAM}
          getNextPageParamFn={getNflNextPageParam}
          filters={filters}
          eventCard={NbaEventCard}
        />
      </div>
    </div>
  );
}
