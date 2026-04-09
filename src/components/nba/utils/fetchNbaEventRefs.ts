import { fetchEventRefsBySeason } from "@/api/espn/fetchEventRefs";
import type { FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";

const SPORT = "basketball";
const LEAGUE = "nba";
const SEASON = "2026";
const PAGE_SIZE = 30;

export const NBA_SEASON_TYPES = [
  { id: 1, name: "Preseason" },
  { id: 2, name: "Regular Season" },
  { id: 3, name: "Playoffs" },
];

export async function fetchNbaEventRefs(pageNumber?: number, seasonTypeId?: number) {
  return fetchEventRefsBySeason(SPORT, LEAGUE, SEASON, {
    pageSize: PAGE_SIZE,
    pageNumber,
    seasonTypeId,
  });
}

export function getNbaNextPageParam(
  lastPage: FetchEventRefsResponse,
  lastCursor: { seasonTypeIdx: number; page: number },
): { seasonTypeIdx: number; page: number } | undefined {
  if (lastPage.pageIndex < lastPage.pageCount) {
    return { seasonTypeIdx: lastCursor.seasonTypeIdx, page: lastCursor.page + 1 };
  }
  const nextIdx = lastCursor.seasonTypeIdx + 1;
  if (nextIdx < NBA_SEASON_TYPES.length) {
    return { seasonTypeIdx: nextIdx, page: 1 };
  }
  return undefined;
}
