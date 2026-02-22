import NbaEventCard from "./nba-event-card";
import { fetchNbaEventRefs } from "./utils/fetchNbaEventRefs";
import InfiniteScrollEvents from "../base/infinite-scroll-events";
import { useEffect, useState } from "react";
import type { NbaEvent, NbaEventFilters } from "@/types/nba";
import NbaFilterSelector from "./nba-filter-selector";
import DownloadIcalButton from "../base/download-ical-button";
import { transformNbaEventsToIcs } from "./utils/transformNbaEventsToIcs";
import { filterNbaEvents } from "./utils/filterNbaEvents";

const NBA_BASE_QUERY_KEY = "nba";

function Nba() {
  const [filters, setFilters] = useState<NbaEventFilters>({
    showPastEvents: true,
  });

  useEffect(() => {
    console.log("Filters updated", filters);
  }, [filters]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex w-full justify-between mb-4">
        <h1 className="text-4xl font-extrabold tracking-tight">NBA Schedule</h1>
        <div className="flex gap-2">
          <DownloadIcalButton<NbaEvent, NbaEventFilters>
            fetchEventRefsFn={fetchNbaEventRefs}
            transformEventsToIcsFn={transformNbaEventsToIcs}
            filterEvents={filterNbaEvents}
            eventFilters={filters}
            baseQueryKey={NBA_BASE_QUERY_KEY}
          />
          <NbaFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          baseQueryKey={NBA_BASE_QUERY_KEY}
          fetchEventRefsFn={fetchNbaEventRefs}
          filters={filters}
          eventCard={NbaEventCard}
        />
      </div>
    </div>
  );
}

export default Nba;
