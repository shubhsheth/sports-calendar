import { fetchEventRefsBySeason } from "@/api/espn/fetchEventRefs";

const SPORT = "basketball";
const LEAGUE = "nba";
const SEASON = "2026";
const PAGE_SIZE = 30;

export const NBA_SEASON_TYPES = [
  { id: 1, name: "Preseason" },
  { id: 2, name: "Regular Season" },
  { id: 5, name: "Play-In Tournament" },
  { id: 3, name: "Playoffs" },
];

export async function fetchNbaEventRefs(pageNumber?: number, seasonTypeId?: number) {
  return fetchEventRefsBySeason(SPORT, LEAGUE, SEASON, {
    pageSize: PAGE_SIZE,
    pageNumber,
    seasonTypeId,
  });
}
