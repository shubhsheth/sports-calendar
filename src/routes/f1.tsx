import { createFileRoute } from "@tanstack/react-router";
import { fetchF1EventRefs } from "@/components/f1/utils/fetchF1EventRefs";
import F1EventCard from "@/components/f1/f1-event-card";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import F1FilterSelector from "@/components/f1/f1-filter-selector";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { F1Event, F1EventFilters } from "@/types/f1";
import DownloadIcalButton from "@/components/base/download-ical-button";
import { transformF1EventsToIcs } from "@/components/f1/utils/transformF1EventsToIcs";
import { filterF1Events } from "@/components/f1/utils/filterF1Events";
import { F1FilterPills } from "@/components/f1/f1-filter-pills";

export const Route = createFileRoute("/f1")({
  component: F1Page,
  head: () => ({
    meta: [
      {
        title:
          "F1 Schedule - Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Stay up-to-date with the latest F1 schedule. Add events to your calendar with one click.",
      },
    ],
  }),
});

const F1_LEAGUE = "f1";
const F1_SEASON_TYPE_IDS = [2];

function F1Page() {
  const [filters, setFilters] = useLocalStorageState<F1EventFilters>(
    "sports-calendar:f1-filters",
    { showPastEvents: false, types: ["2", "3", "4", "6"] }
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">F1 Schedule</h1>
        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
          <DownloadIcalButton<F1Event, F1EventFilters>
            league={F1_LEAGUE}
            seasonTypeIds={F1_SEASON_TYPE_IDS}
            fetchEventRefsFn={fetchF1EventRefs}
            transformEventsToIcsFn={transformF1EventsToIcs}
            filterEvents={filterF1Events}
            eventFilters={filters}
          />
          <F1FilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <F1FilterPills filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          league={F1_LEAGUE}
          seasonTypeIds={F1_SEASON_TYPE_IDS}
          fetchEventRefsFn={fetchF1EventRefs}
          filters={filters}
          eventCard={F1EventCard}
        />
      </div>
    </div>
  );
}
