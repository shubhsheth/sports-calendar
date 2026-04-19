export async function fetchEventDetails<T>(refUrl: string): Promise<T> {
  const url = refUrl.replace("http://", "https://");
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`ESPN API error: ${response.status} ${url}`);
  return response.json() as Promise<T>;
}
