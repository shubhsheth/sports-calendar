import { fetchEventRefsBySeason } from "@/api/espn/fetchEventRefs";

export const fetchF1EventRefs = async (pageNumber?: number) => {
  const sport = "racing";
  const league = "f1";
  const season = "2026";
  const pageSize = 30;

  return await fetchEventRefsBySeason(sport, league, season, {
    pageSize,
    pageNumber,
  });
};
