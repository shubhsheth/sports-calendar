import React, { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import type { EventRef } from "@/types/base";
import type { FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";
import { analytics } from "@/lib/analytics";

interface InfiniteScrollEventsProps {
  league: string;
  seasonTypeIds: number[];
  fetchEventRefsFn: (
    pageNumber: number,
    seasonTypeId: number
  ) => Promise<FetchEventRefsResponse>;
  filters: unknown;
  eventCard: React.ComponentType<{
    league: string;
    eventRef: EventRef;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: any;
  }>;
}

function InfiniteScrollEvents({
  league,
  seasonTypeIds,
  fetchEventRefsFn,
  filters,
  eventCard: EventCard,
}: InfiniteScrollEventsProps) {
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
    queryKey: [league, "events", "infinite"],
    queryFn: ({ pageParam }) => {
      const { seasonTypeId, pageNumber } = pageParam as {
        seasonTypeId: number;
        pageNumber: number;
      };
      return fetchEventRefsFn(pageNumber, seasonTypeId);
    },
    initialPageParam: { seasonTypeId: seasonTypeIds[0], pageNumber: 1 },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const { seasonTypeId, pageNumber } = lastPageParam as {
        seasonTypeId: number;
        pageNumber: number;
      };
      if (lastPage.pageIndex < lastPage.pageCount) {
        return { seasonTypeId, pageNumber: pageNumber + 1 };
      }
      const nextIdx = seasonTypeIds.indexOf(seasonTypeId) + 1;
      return nextIdx < seasonTypeIds.length
        ? { seasonTypeId: seasonTypeIds[nextIdx], pageNumber: 1 }
        : undefined;
    },
  });

  useEffect(() => {
    // If the sentinel is in view, we have more to load, AND we aren't currently loading...
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
      analytics.scheduleNextPageLoaded(league, (data?.pages.length ?? 0) + 1);
    }
    // We add 'isFetchingNextPage' and 'data' so that as soon as a
    // page finishes loading, if the sentinel is STILL visible,
    // it immediately triggers the next page.
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, data, league]);

  if (isLoading) return <div>Loading schedule...</div>;
  if (isError) return <div>Error loading schedule: {error.message}</div>;

  return (
    <>
      {data?.pages.map((page, pageIdx) => (
        <React.Fragment key={`page-${pageIdx}`}>
          {page.items.map(item => (
            <EventCard
              key={item.$ref}
              league={league}
              eventRef={item}
              filters={filters}
            />
          ))}
        </React.Fragment>
      ))}
      <div ref={ref} className="py-10 flex justify-center w-full">
        {hasNextPage ? "Loading more..." : "End of results"}
      </div>
    </>
  );
}

export default InfiniteScrollEvents;
