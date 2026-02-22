import type { BaseEvent } from "../../types/base";

export async function fetchEventDetails<T = BaseEvent>(
  refUrl: string,
): Promise<T> {
  const response = await fetch(refUrl);
  const data = await response.json();
  return data as T;
}
