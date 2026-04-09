import { fetchEventRefsBySeason } from "@/api/espn/fetchEventRefs";
import type { SeasonCursor, FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";

export const NBA_SEASON_TYPES = [
  { id: "1", name: "Preseason" },
  { id: "2", name: "Regular Season" },
  { id: "3", name: "Playoffs" },
] as const;

export async function fetchNbaEventRefs(
  cursor: SeasonCursor,
): Promise<FetchEventRefsResponse> {
  const seasonType = NBA_SEASON_TYPES[cursor.seasonTypeIdx];
  return fetchEventRefsBySeason("basketball", "nba", "2026", {
    seasonTypeId: seasonType.id,
    pageSize: 30,
    pageNumber: cursor.page,
  });
}

export function getNbaNextPageParam(
  lastPage: FetchEventRefsResponse,
  lastCursor: SeasonCursor,
): SeasonCursor | undefined {
  if (lastPage.pageIndex < lastPage.pageCount) {
    return { seasonTypeIdx: lastCursor.seasonTypeIdx, page: lastCursor.page + 1 };
  }
  const nextIdx = lastCursor.seasonTypeIdx + 1;
  if (nextIdx < NBA_SEASON_TYPES.length) {
    return { seasonTypeIdx: nextIdx, page: 1 };
  }
  return undefined;
}
