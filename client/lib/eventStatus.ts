import dayjs from "dayjs";

/** Returns true while an event is actively in progress. */
export function isEventLive(date: string, durationMinutes: number): boolean {
  const start = dayjs(date);
  return (
    dayjs().isAfter(start) &&
    dayjs().isBefore(start.add(durationMinutes, "minutes"))
  );
}

/** Returns true once an event has fully ended. */
export function isEventPast(date: string, durationMinutes: number): boolean {
  return dayjs().isAfter(dayjs(date).add(durationMinutes, "minutes"));
}
