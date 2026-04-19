import type { EventRef } from "@sports-calendar/shared";

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
    seasonTypeId?: number;
    pageSize?: number;
    pageNumber?: number;
  }
): Promise<FetchEventRefsResponse> {
  const seasonTypeId = pagination?.seasonTypeId ?? 2;
  const pageSize = pagination?.pageSize ?? 30;
  const pageNumber = pagination?.pageNumber ?? 1;
  const url = `https://sports.core.api.espn.com/v2/sports/${sportId}/leagues/${leagueId}/seasons/${seasonId}/types/${seasonTypeId}/events/?limit=${pageSize}&page=${pageNumber}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`ESPN API error: ${response.status} ${url}`);
  const data = (await response.json()) as Record<string, unknown>;
  return {
    items: data["items"] as EventRef[],
    pageCount: data["pageCount"] as number,
    pageIndex: data["pageIndex"] as number,
  };
}

export async function fetchAllEventRefsBySeason(
  sportId: string,
  leagueId: string,
  seasonId: string,
  seasonTypeIds: number[]
): Promise<EventRef[]> {
  const allRefs: EventRef[] = [];
  for (const seasonTypeId of seasonTypeIds) {
    let pageNumber = 1;
    while (true) {
      const page = await fetchEventRefsBySeason(sportId, leagueId, seasonId, {
        seasonTypeId,
        pageNumber,
      });
      allRefs.push(...page.items);
      if (page.pageIndex >= page.pageCount) break;
      pageNumber++;
    }
  }
  return allRefs;
}
