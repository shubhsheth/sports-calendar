import { fetchF1EventRefs } from "./utils/fetchF1EventRefs";
import F1EventCard from "./f1-event-card";
import InfiniteScrollEvents from "../base/infinite-scroll-events";
import F1FilterSelector from "./f1-filter-selector";
import { useEffect, useState } from "react";
import type { F1Event, F1EventFilters } from "@/types/f1";
import DownloadIcalButton from "../base/download-ical-button";
import { transformF1EventsToIcs } from "./utils/transformF1EventsToIcs";
import { filterF1Events } from "./utils/filterF1Events";

const F1_BASE_QUERY_KEY = "f1";

function F1() {
  const [filters, setFilters] = useState<F1EventFilters>({
    showPastEvents: true,
    types: ["2", "3", "4", "6"],
  });

  useEffect(() => {
    console.log("Filters updated", filters);
  }, [filters]);

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

export default F1;
