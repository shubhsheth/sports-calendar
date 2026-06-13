import { fetchEventRefsBySeason, type EventRef } from "../espn/fetchEventRefs";
import { fetchEventDetails } from "../espn/fetchEventDetails";
import { mapWithConcurrency } from "../espn/mapWithConcurrency";
import type { F1Event } from "./types";

const SPORT = "racing";
const LEAGUE = "f1";
const SEASON = "2026";
const PAGE_SIZE = 30;
const SEASON_TYPE_IDS = [2];
const FETCH_CONCURRENCY = 8;

export async function fetchAllF1Events(): Promise<F1Event[]> {
  const refs = await fetchAllEventRefs();
  return mapWithConcurrency(refs, FETCH_CONCURRENCY, ref =>
    fetchEventDetails<F1Event>(ref.$ref)
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
