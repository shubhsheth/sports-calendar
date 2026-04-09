import type { EventRef } from "@/types/base";

export type SeasonCursor = { seasonTypeIdx: number; page: number };

export type FetchEventRefsResponse = {
  items: EventRef[];
  pageCount: number;
  pageIndex: number;
};

export async function fetchEventRefsBySeason(
  sportId: string,
  leagueId: string,
  seasonId: string,
  pagination?: {
    seasonTypeId?: string;
    pageSize?: number;
    pageNumber?: number;
  },
) {
  const seasonTypeId = pagination?.seasonTypeId ?? "2";
  const url = `https://sports.core.api.espn.com/v2/sports/${sportId}/leagues/${leagueId}/seasons/${seasonId}/types/${seasonTypeId}/events/?limit=${pagination?.pageSize ?? 30}&page=${pagination?.pageNumber ?? 1}`;
  const response = await fetch(url);
  const data = await response.json();
  return {
    items: data["items"] as EventRef[],
    pageCount: data["pageCount"] as number,
    pageIndex: data["pageIndex"] as number,
  };
}
