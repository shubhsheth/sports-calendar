import {
  fetchEventRefsBySeason,
  type EventRef,
} from "../espn/fetchEventRefs.ts";
import { fetchEventDetails } from "../espn/fetchEventDetails.ts";
import { mapWithConcurrency } from "../espn/mapWithConcurrency.ts";
import type { NbaEvent } from "./types.ts";

const SPORT = "basketball";
const LEAGUE = "nba";
const SEASON = "2026"; // ESPN season id = calendar year the season starts
const PAGE_SIZE = 30;
// Phases fetched and merged: 2 = regular season, 3 = postseason.
const SEASON_TYPE_IDS = [2, 3];
const FETCH_CONCURRENCY = 8;

export async function fetchAllNbaEvents(): Promise<NbaEvent[]> {
  const refs = await fetchAllEventRefs();
  return mapWithConcurrency(refs, FETCH_CONCURRENCY, ref =>
    fetchEventDetails<NbaEvent>(ref.$ref)
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
