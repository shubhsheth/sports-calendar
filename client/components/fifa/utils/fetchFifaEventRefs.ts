import { fetchEventRefsBySeason } from "@sports-calendar/shared";

const SPORT = "soccer";
const LEAGUE = "fifa.world";
const SEASON = "2026";
const PAGE_SIZE = 30;

export const FIFA_SEASON_TYPES = [
  { id: 1, name: "Group Stage" },
  { id: 2, name: "Knockout Stage" },
];

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
