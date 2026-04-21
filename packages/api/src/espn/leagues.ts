import type {
  EventRef,
  NbaEvent,
  NflEvent,
  F1Event,
  IplEvent,
} from "@sports-calendar/shared";
import {
  fetchEventRefsBySeason,
  fetchEventDetails,
  fetchIplEventsByDate,
  getIplSeasonDates,
} from "@sports-calendar/shared";
import { mapWithConcurrency } from "./mapWithConcurrency";

const FETCH_CONCURRENCY = 8;

async function fetchAllEventRefs(
  sportId: string,
  leagueId: string,
  seasonId: string,
  seasonTypeIds: number[]
): Promise<EventRef[]> {
  const refs: EventRef[] = [];
  for (const seasonTypeId of seasonTypeIds) {
    let pageNumber = 1;
    while (true) {
      const { items, pageCount, pageIndex } = await fetchEventRefsBySeason(
        sportId,
        leagueId,
        seasonId,
        { seasonTypeId, pageNumber }
      );
      refs.push(...items);
      if (pageIndex >= pageCount) break;
      pageNumber++;
    }
  }
  return refs;
}

export async function fetchAllNbaEvents(): Promise<NbaEvent[]> {
  const refs = await fetchAllEventRefs("basketball", "nba", "2026", [
    1, 2, 5, 3,
  ]);
  return mapWithConcurrency(refs, FETCH_CONCURRENCY, ref =>
    fetchEventDetails<NbaEvent>(ref.$ref)
  );
}

export async function fetchAllNflEvents(): Promise<NflEvent[]> {
  const refs = await fetchAllEventRefs("football", "nfl", "2025", [1, 2, 3]);
  return mapWithConcurrency(refs, FETCH_CONCURRENCY, ref =>
    fetchEventDetails<NflEvent>(ref.$ref)
  );
}

export async function fetchAllF1Events(): Promise<F1Event[]> {
  const refs = await fetchAllEventRefs("racing", "f1", "2026", [2]);
  return mapWithConcurrency(refs, FETCH_CONCURRENCY, ref =>
    fetchEventDetails<F1Event>(ref.$ref)
  );
}

export async function fetchAllIplEvents(): Promise<IplEvent[]> {
  const dates = getIplSeasonDates();
  const batches = await mapWithConcurrency(dates, FETCH_CONCURRENCY, date =>
    fetchIplEventsByDate(date)
  );
  return batches.flat();
}
