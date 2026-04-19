export async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = new Array(items.length);
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
