export type EventRef = {
  $ref: string;
};

export type FetchEventRefsResponse = {
  items: EventRef[];
  pageCount: number;
  pageIndex: number;
};

/**
 * Lists event `$ref` stubs for one season "type" (phase), a page at a time:
 *
 *   GET …/sports/{sportId}/leagues/{leagueId}/seasons/{seasonId}
 *       /types/{seasonTypeId}/events/?limit={pageSize}&page={pageNumber}
 *
 * Returns `{ items, pageCount, pageIndex }`; callers page until
 * `pageIndex >= pageCount`. `seasonTypeId` defaults to `2` (regular season) and
 * `pageSize` to `30`. Which phase(s) a league actually fetches is decided by its
 * `SEASON_TYPE_IDS` in `shared/src/<league>/fetch.ts`; the client's infinite
 * scroll passes a single `seasonTypeId` per query.
 */
export async function fetchEventRefsBySeason(
  sportId: string,
  leagueId: string,
  seasonId: string,
  pagination?: {
    seasonTypeId?: number;
    pageSize?: number;
    pageNumber?: number;
  }
) {
  const seasonTypeId = pagination?.seasonTypeId ?? 2;
  const url = `https://sports.core.api.espn.com/v2/sports/${sportId}/leagues/${leagueId}/seasons/${seasonId}/types/${seasonTypeId}/events/?limit=${pagination?.pageSize ?? 30}&page=${pagination?.pageNumber ?? 1}`;
  const response = await fetch(url);
  const data = (await response.json()) as {
    items: EventRef[];
    pageCount: number;
    pageIndex: number;
  };
  return {
    items: data.items,
    pageCount: data.pageCount,
    pageIndex: data.pageIndex,
  };
}
