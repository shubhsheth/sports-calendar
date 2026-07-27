// Four attempts at 250ms/500ms/1s spans ~1.75s, chosen because ESPN blips
// observed live arrived in bursts that a tighter budget rode straight through.
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 250;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches JSON from ESPN, retrying transport failures with exponential backoff
 * and throwing if every attempt fails.
 *
 * A cricket team's schedule is assembled from ~30–45 requests, and each one
 * covers a distinct slice of it: a discovery query owns a span of the calendar,
 * a series request owns an entire tour. Treating a failed request as "nothing
 * scheduled" therefore silently drops whole tours — measured live, one dropped
 * series request cost 18 of India's 47 matches — and leaves the caller unable
 * to tell a complete schedule from a truncated one. So failures propagate:
 * partial data is never worth more than an error the caller can retry.
 *
 * Non-2xx responses count as failures — ESPN serves HTML error pages that would
 * otherwise fail JSON parsing one layer up, where the status is no longer visible.
 *
 * @param url - The ESPN endpoint to fetch.
 * @returns The parsed JSON body.
 * @throws If all {@link MAX_ATTEMPTS} attempts fail.
 */
export async function fetchEspnJson<T>(url: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `ESPN request failed after ${MAX_ATTEMPTS} attempts: ${url}`,
    { cause: lastError }
  );
}
