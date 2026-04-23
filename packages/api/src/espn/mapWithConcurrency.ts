export async function mapWithConcurrency<T, I>(
  items: I[],
  limit: number,
  mapper: (item: I) => Promise<T>
): Promise<T[]> {
  const results: T[] = new Array(items.length);
  let index = 0;

  async function runNext(): Promise<void> {
    if (index >= items.length) return;
    const current = index++;
    results[current] = await mapper(items[current]!);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    runNext()
  );
  await Promise.all(workers);
  return results;
}
