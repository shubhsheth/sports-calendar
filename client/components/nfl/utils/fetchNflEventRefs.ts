import { fetchEventRefsBySeason } from "@sports-calendar/shared";

const SPORT = "football";
const LEAGUE = "nfl";
const SEASON = "2025";
const PAGE_SIZE = 30;

export async function fetchNflEventRefs(
  pageNumber?: number,
  seasonTypeId?: number
) {
  return fetchEventRefsBySeason(SPORT, LEAGUE, SEASON, {
    pageSize: PAGE_SIZE,
    pageNumber,
    seasonTypeId,
  });
}
