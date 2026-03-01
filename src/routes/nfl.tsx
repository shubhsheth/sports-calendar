import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { NflEvent, NflEventFilters } from "@/types/nfl";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import DownloadIcalButton from "@/components/base/download-ical-button";
import NbaEventCard from "@/components/nba/nba-event-card";
import NbaFilterSelector from "@/components/nba/nba-filter-selector";
import { filterNbaEvents } from "@/components/nba/utils/filterNbaEvents";
import { fetchNflEventRefs } from "@/components/nfl/utils/fetchNflEventRefs";
import { transformNflEventsToIcs } from "@/components/nfl/utils/transformNflEventsToIcs";

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

function NflPage() {
  const [filters, setFilters] = useState<NflEventFilters>({
    showPastEvents: true,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex w-full justify-between mb-4">
        <h1 className="text-4xl font-extrabold tracking-tight">NFL Schedule</h1>
        <div className="flex gap-2">
          <DownloadIcalButton<NflEvent, NflEventFilters>
            fetchEventRefsFn={fetchNflEventRefs}
            transformEventsToIcsFn={transformNflEventsToIcs}
            filterEvents={filterNbaEvents}
            eventFilters={filters}
            baseQueryKey={NFL_BASE_QUERY_KEY}
          />
          <NbaFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          baseQueryKey={NFL_BASE_QUERY_KEY}
          fetchEventRefsFn={fetchNflEventRefs}
          filters={filters}
          eventCard={NbaEventCard}
        />
      </div>
    </div>
  );
}
