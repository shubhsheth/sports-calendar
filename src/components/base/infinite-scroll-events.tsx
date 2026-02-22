import React, { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import type { EventRef } from "@/types/base";
import type { FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";

interface InfiniteScrollEventsProps {
  baseQueryKey: string;
  fetchEventRefsFn: (pageParam: number) => Promise<FetchEventRefsResponse>;
  filters: unknown;
  eventCard: React.ComponentType<{
    baseQueryKey: string;
    eventRef: EventRef;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: any;
  }>;
}

function InfiniteScrollEvents({
  baseQueryKey,
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
    queryKey: [baseQueryKey, "events", "infinite"],
    queryFn: ({ pageParam }) => fetchEventRefsFn(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const nextPageNumber = lastPage.pageIndex + 1;
      const hasMorePages = !!(lastPage.pageIndex < lastPage.pageCount);
      return hasMorePages ? nextPageNumber : undefined;
    },
  });

  useEffect(() => {
    // If the sentinel is in view, we have more to load, AND we aren't currently loading...
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    // We add 'isFetchingNextPage' and 'data' so that as soon as a
    // page finishes loading, if the sentinel is STILL visible,
    // it immediately triggers the next page.
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, data]);

  if (isLoading) return <div>Loading schedule...</div>;
  if (isError) return <div>Error loading schedule: {error.message}</div>;

  return (
    <>
      {data?.pages.map((page, pageIdx) => (
        <React.Fragment key={`page-${pageIdx}`}>
          {page.items.map((item) => (
            <EventCard
              key={item.$ref}
              baseQueryKey={baseQueryKey}
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
