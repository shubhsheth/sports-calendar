import type { BaseEvent } from "../../types/base";

export async function fetchEventDetails<T = BaseEvent>(
  refUrl: string,
): Promise<T> {
  refUrl.replace("http://", "https://");
  const response = await fetch(refUrl);
  const data = await response.json();
  return data as T;
}
