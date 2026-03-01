import { fetchEventRefsBySeason } from "@/api/espn/fetchEventRefs";

export const fetchNflEventRefs = async (pageNumber?: number) => {
  const sport = "football";
  const league = "nfl";
  const season = "2025";
  const pageSize = 30;

  return await fetchEventRefsBySeason(sport, league, season, {
    pageSize,
    pageNumber,
  });
};
