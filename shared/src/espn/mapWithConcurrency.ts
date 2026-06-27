/**
 * Maps `mapper` over `items` with at most `limit` calls in flight at once,
 * preserving input order in the results.
 *
 * Used wherever many `$ref`s are followed at once — the per-league full-season
 * `fetch.ts` orchestrators (backend feeds) and the client's ICS download button.
 * Callers pass `limit: 8`; that figure is arbitrary, chosen to avoid flooding
 * the user's device with parallel requests, not to dodge an ESPN rate limit.
 *
 * @param items - The input items to map over.
 * @param limit - Maximum number of `mapper` calls in flight at once.
 * @param mapper - Async function applied to each item.
 * @returns The mapped results, in the same order as `items`.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function runNext(): Promise<void> {
    if (index >= items.length) return;
    const current = index++;
    results[current] = await mapper(items[current]);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    runNext()
  );
  await Promise.all(workers);
  return results;
}
