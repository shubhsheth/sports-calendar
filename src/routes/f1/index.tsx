import { createFileRoute } from "@tanstack/react-router";
import { fetchF1EventRefs } from "@/components/f1/utils/fetchF1EventRefs";
import F1EventCard from "@/components/f1/f1-event-card";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import F1FilterSelector from "@/components/f1/f1-filter-selector";
import { useState } from "react";
import type { F1Event, F1EventFilters } from "@/types/f1";
import DownloadIcalButton from "@/components/base/download-ical-button";
import { transformF1EventsToIcs } from "@/components/f1/utils/transformF1EventsToIcs";
import { filterF1Events } from "@/components/f1/utils/filterF1Events";

export const Route = createFileRoute("/f1/")({
  component: F1Page,
});

const F1_BASE_QUERY_KEY = "f1";

function F1Page() {
  const [filters, setFilters] = useState<F1EventFilters>({
    showPastEvents: true,
    types: ["2", "3", "4", "6"],
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex w-full justify-between mb-4">
        <h1 className="text-4xl font-extrabold tracking-tight">F1 Schedule</h1>
        <div className="flex gap-2">
          <DownloadIcalButton<F1Event, F1EventFilters>
            fetchEventRefsFn={fetchF1EventRefs}
            transformEventsToIcsFn={transformF1EventsToIcs}
            filterEvents={filterF1Events}
            eventFilters={filters}
            baseQueryKey={F1_BASE_QUERY_KEY}
          />
          <F1FilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          baseQueryKey={F1_BASE_QUERY_KEY}
          fetchEventRefsFn={fetchF1EventRefs}
          filters={filters}
          eventCard={F1EventCard}
        />
      </div>
    </div>
  );
}
