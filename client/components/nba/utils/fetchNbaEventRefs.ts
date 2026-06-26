import { fetchEventRefsBySeason } from "@sports-calendar/shared";

const SPORT = "basketball";
const LEAGUE = "nba";
const SEASON = "2026";
const PAGE_SIZE = 30;

export async function fetchNbaEventRefs(
  pageNumber?: number,
  seasonTypeId?: number
) {
  return fetchEventRefsBySeason(SPORT, LEAGUE, SEASON, {
    pageSize: PAGE_SIZE,
    pageNumber,
    seasonTypeId,
  });
}
