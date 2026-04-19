import { icsHeaders } from "./icsHeaders.ts";

export async function withCache(
  request: Request,
  ctx: ExecutionContext,
  fn: () => Promise<string>
): Promise<Response> {
  // caches.default is only available in the deployed CF Workers runtime
  const cache = typeof caches !== "undefined" ? caches.default : null;

  if (cache) {
    const cached = await cache.match(request);
    if (cached) return cached;
  }

  const icsString = await fn();
  const response = new Response(icsString, { headers: icsHeaders() });

  if (cache) {
    ctx.waitUntil(cache.put(request, response.clone()));
  }

  return response;
}
