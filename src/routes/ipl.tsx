import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { analytics } from "@/lib/analytics";
import { useInView } from "react-intersection-observer";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { IplEvent, IplEventFilters } from "@/types/ipl";
import IplEventCard from "@/components/ipl/ipl-event-card";
import IplFilterSelector from "@/components/ipl/ipl-filter-selector";
import { IplFilterPills } from "@/components/ipl/ipl-filter-pills";
import IplDownloadIcalButton from "@/components/ipl/ipl-download-ical-button";
import {
  fetchIplEventsByDate,
  getIplSeasonDates,
} from "@/components/ipl/utils/fetchIplEvents";
import { filterIplEvents } from "@/components/ipl/utils/filterIplEvents";

export const Route = createFileRoute("/ipl")({
  component: IplPage,
  head: () => ({
    meta: [
      {
        title:
          "IPL Schedule - Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Stay up-to-date with the latest IPL schedule. Add matches to your calendar with one click.",
      },
    ],
  }),
});

const IPL_BASE_QUERY_KEY = "ipl";
const IPL_SEASON_DATES = getIplSeasonDates();

function IplPage() {
  const [filters, setFilters] = useLocalStorageState<IplEventFilters>(
    "sports-calendar:ipl-filters",
    { showPastEvents: false, teamIds: [] }
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">IPL Schedule</h1>
        <div className="flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none">
          <IplDownloadIcalButton filters={filters} />
          <IplFilterSelector filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <IplFilterPills filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap gap-4">
        <IplEventList filters={filters} />
      </div>
    </div>
  );
}

function IplEventList({ filters }: { filters: IplEventFilters }) {
  const { ref, inView } = useInView({ rootMargin: "500px" });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: [IPL_BASE_QUERY_KEY, "events", "infinite"],
    queryFn: ({ pageParam }) => fetchIplEventsByDate(pageParam as string),
    initialPageParam: IPL_SEASON_DATES[0],
    getNextPageParam: (_lastPage, _allPages, lastPageParam) => {
      const idx = IPL_SEASON_DATES.indexOf(lastPageParam as string);
      return idx < IPL_SEASON_DATES.length - 1
        ? IPL_SEASON_DATES[idx + 1]
        : undefined;
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
      analytics.scheduleNextPageLoaded(
        "ipl",
        (data?.pages.length ?? 0) + 1
      );
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, data]);

  if (isLoading) return <div>Loading schedule...</div>;
  if (isError) return <div>Error loading schedule: {error.message}</div>;

  const allEvents = data?.pages.flat() ?? [];
  const filteredEvents = filterIplEvents(allEvents as IplEvent[], filters);

  return (
    <>
      {filteredEvents.map(event => (
        <IplEventCard key={event.id} event={event} filters={filters} />
      ))}
      <div ref={ref} className="py-10 flex justify-center w-full">
        {hasNextPage ? "Loading more..." : "End of results"}
      </div>
    </>
  );
}
