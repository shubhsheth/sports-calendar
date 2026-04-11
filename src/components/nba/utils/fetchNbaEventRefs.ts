import { fetchEventRefsBySeason } from "@/api/espn/fetchEventRefs";

export const fetchNbaEventRefs = async (pageNumber?: number) => {
  const sport = "basketball";
  const league = "nba";
  const season = "2026";
  const pageSize = 30;

  return await fetchEventRefsBySeason(sport, league, season, {
    pageSize,
    pageNumber,
  });
};
