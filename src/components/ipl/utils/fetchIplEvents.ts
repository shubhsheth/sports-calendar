import type { IplEvent } from "@/types/ipl";
import dayjs from "dayjs";

const LEAGUE_ID = "8048";

export const IPL_2026 = {
  LEAGUE_ID,
  START_DATE: "2026-03-28",
  END_DATE: "2026-05-24",
};

export async function fetchIplEventsByDate(
  dateStr: string
): Promise<IplEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${LEAGUE_ID}/events?dates=${dateStr}`;
  const response = await fetch(url);
  const data = await response.json();
  return (data.events ?? []) as IplEvent[];
}

export function getIplSeasonDates(): string[] {
  const dates: string[] = [];
  let current = dayjs(IPL_2026.START_DATE);
  const end = dayjs(IPL_2026.END_DATE);
  while (!current.isAfter(end)) {
    dates.push(current.format("YYYYMMDD"));
    current = current.add(1, "day");
  }
  return dates;
}
