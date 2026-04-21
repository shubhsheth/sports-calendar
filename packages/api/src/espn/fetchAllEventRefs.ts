import type { EventRef } from "@sports-calendar/shared";
import { fetchEventRefsBySeason } from "@sports-calendar/shared";

export async function fetchAllEventRefs(
  sportId: string,
  leagueId: string,
  seasonId: string,
  seasonTypeIds: number[]
): Promise<EventRef[]> {
  const refs: EventRef[] = [];
  for (const seasonTypeId of seasonTypeIds) {
    let pageNumber = 1;
    while (true) {
      const { items, pageCount, pageIndex } = await fetchEventRefsBySeason(
        sportId,
        leagueId,
        seasonId,
        { seasonTypeId, pageNumber }
      );
      refs.push(...items);
      if (pageIndex >= pageCount) break;
      pageNumber++;
    }
  }
  return refs;
}
