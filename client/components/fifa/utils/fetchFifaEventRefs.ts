import { fetchEventRefsBySeason } from "@sports-calendar/shared";

const SPORT = "soccer";
const LEAGUE = "fifa.world";
const SEASON = "2026";
const PAGE_SIZE = 30;

export async function fetchFifaEventRefs(
  pageNumber?: number,
  seasonTypeId?: number
) {
  return fetchEventRefsBySeason(SPORT, LEAGUE, SEASON, {
    pageSize: PAGE_SIZE,
    pageNumber,
    seasonTypeId,
  });
}
