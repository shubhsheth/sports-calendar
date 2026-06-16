import { createFileRoute } from "@tanstack/react-router";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { FifaEvent, FifaEventFilters } from "@sports-calendar/shared";
import InfiniteScrollEvents from "@/components/base/infinite-scroll-events";
import DownloadIcalButton from "@/components/base/download-ical-button";
import FifaEventCard from "@/components/fifa/fifa-event-card";
import FifaFilterSelector from "@/components/fifa/fifa-filter-selector";
import { fetchFifaEventRefs } from "@/components/fifa/utils/fetchFifaEventRefs";
import { transformFifaEventsToIcs } from "@/components/fifa/utils/transformFifaEventsToIcs";
import { filterFifaEvents } from "@sports-calendar/shared";
import { buildFifaFeedUrl } from "@/components/fifa/utils/buildFifaFeedUrl";
import { FifaFilterPills } from "@/components/fifa/fifa-filter-pills";

export const Route = createFileRoute("/fifa")({
  component: FifaPage,
  head: () => ({
    meta: [
      {
        title:
          "FIFA World Cup Schedule - Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Stay up-to-date with the latest FIFA World Cup schedule. Add matches to your calendar with one click.",
      },
    ],
  }),
});

const FIFA_LEAGUE = "fifa";
const FIFA_SEASON_TYPE_IDS = [1, 2];

function FifaPage() {
  const [filters, setFilters] = useLocalStorageState<FifaEventFilters>(
    "sports-calendar:fifa-filters",
    { showPastEvents: false, teamIds: [] }
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">
          FIFA World Cup Schedule
        </h1>
        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
          <DownloadIcalButton<FifaEvent, FifaEventFilters>
            league={FIFA_LEAGUE}
            seasonTypeIds={FIFA_SEASON_TYPE_IDS}
            fetchEventRefsFn={fetchFifaEventRefs}
            transformEventsToIcsFn={transformFifaEventsToIcs}
            filterEvents={filterFifaEvents}
            buildFeedUrlFn={buildFifaFeedUrl}
            eventFilters={filters}
          />
          <FifaFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <FifaFilterPills filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap gap-4">
        <InfiniteScrollEvents
          league={FIFA_LEAGUE}
          seasonTypeIds={FIFA_SEASON_TYPE_IDS}
          fetchEventRefsFn={fetchFifaEventRefs}
          filters={filters}
          eventCard={FifaEventCard}
        />
      </div>
    </div>
  );
}
