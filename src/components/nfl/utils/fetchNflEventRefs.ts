import { fetchEventRefsBySeason } from "@/api/espn/fetchEventRefs";
import type { SeasonCursor, FetchEventRefsResponse } from "@/api/espn/fetchEventRefs";

export const NFL_SEASON_TYPES = [
  { id: "1", name: "Preseason" },
  { id: "2", name: "Regular Season" },
  { id: "3", name: "Playoffs" },
] as const;

export async function fetchNflEventRefs(
  cursor: SeasonCursor,
): Promise<FetchEventRefsResponse> {
  const seasonType = NFL_SEASON_TYPES[cursor.seasonTypeIdx];
  return fetchEventRefsBySeason("football", "nfl", "2025", {
    seasonTypeId: seasonType.id,
    pageSize: 30,
    pageNumber: cursor.page,
  });
}

export function getNflNextPageParam(
  lastPage: FetchEventRefsResponse,
  lastCursor: SeasonCursor,
): SeasonCursor | undefined {
  if (lastPage.pageIndex < lastPage.pageCount) {
    return { seasonTypeIdx: lastCursor.seasonTypeIdx, page: lastCursor.page + 1 };
  }
  const nextIdx = lastCursor.seasonTypeIdx + 1;
  if (nextIdx < NFL_SEASON_TYPES.length) {
    return { seasonTypeIdx: nextIdx, page: 1 };
  }
  return undefined;
}
