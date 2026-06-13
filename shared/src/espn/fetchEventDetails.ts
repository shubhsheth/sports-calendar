export type BaseEvent = {
  $ref: string;
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: { $ref: string };
};

export async function fetchEventDetails<T = BaseEvent>(
  refUrl: string
): Promise<T> {
  refUrl = refUrl.replace("http://", "https://");
  const response = await fetch(refUrl);
  const data = await response.json();
  return data as T;
}
