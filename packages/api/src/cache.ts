export async function withCache(
  key: string,
  ttl: number,
  fn: () => Promise<string>,
): Promise<string> {
  if (typeof caches === "undefined") {
    return fn();
  }

  const request = new Request(key);
  const cached = await caches.default.match(request);
  if (cached) {
    return cached.text();
  }

  const result = await fn();
  const response = new Response(result, {
    headers: { "Cache-Control": `public, max-age=${ttl}` },
  });
  await caches.default.put(request, response);
  return result;
}
