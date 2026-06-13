import { fetchEventRefsBySeason, type EventRef } from "../espn/fetchEventRefs.ts";
import { fetchEventDetails } from "../espn/fetchEventDetails.ts";
import { mapWithConcurrency } from "../espn/mapWithConcurrency.ts";
import type { NflEvent } from "./types.ts";

const SPORT = "football";
const LEAGUE = "nfl";
const SEASON = "2025";
const PAGE_SIZE = 30;
const SEASON_TYPE_IDS = [1, 2, 3];
const FETCH_CONCURRENCY = 8;

export async function fetchAllNflEvents(): Promise<NflEvent[]> {
  const refs = await fetchAllEventRefs();
  return mapWithConcurrency(refs, FETCH_CONCURRENCY, ref =>
    fetchEventDetails<NflEvent>(ref.$ref)
  );
}

async function fetchAllEventRefs(): Promise<EventRef[]> {
  const allRefs: EventRef[] = [];

  for (const seasonTypeId of SEASON_TYPE_IDS) {
    let pageNumber = 1;
    while (true) {
      const page = await fetchEventRefsBySeason(SPORT, LEAGUE, SEASON, {
        pageSize: PAGE_SIZE,
        pageNumber,
        seasonTypeId,
      });
      allRefs.push(...page.items);
      if (page.pageIndex >= page.pageCount) break;
      pageNumber++;
    }
  }

  return allRefs;
}
