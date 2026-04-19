import type { NbaEvent, NflEvent, F1Event } from "@sports-calendar/shared";
import { fetchAllEventRefsBySeason } from "./fetchEventRefs.ts";
import { fetchEventDetails } from "./fetchEventDetails.ts";
import { fetchAllIplEvents } from "./fetchIplEvents.ts";
import { mapWithConcurrency } from "./utils.ts";
import type { IplEvent } from "@sports-calendar/shared";

const CONCURRENCY = 8;

async function fetchAllEventsForSport<T>(
  sportId: string,
  leagueId: string,
  seasonId: string,
  seasonTypeIds: number[]
): Promise<T[]> {
  const refs = await fetchAllEventRefsBySeason(sportId, leagueId, seasonId, seasonTypeIds);
  return mapWithConcurrency(refs, CONCURRENCY, ref =>
    fetchEventDetails<T>(ref.$ref)
  );
}

export async function fetchAllNbaEvents(): Promise<NbaEvent[]> {
  return fetchAllEventsForSport<NbaEvent>(
    "basketball", "nba", "2026",
    [1, 2, 5, 3] // preseason, regular, play-in, playoffs
  );
}

export async function fetchAllNflEvents(): Promise<NflEvent[]> {
  return fetchAllEventsForSport<NflEvent>(
    "football", "nfl", "2025",
    [1, 2, 3] // preseason, regular, playoffs
  );
}

export async function fetchAllF1Events(): Promise<F1Event[]> {
  return fetchAllEventsForSport<F1Event>(
    "racing", "f1", "2026",
    [2] // regular season
  );
}

export { fetchAllIplEvents };
export type { IplEvent };
