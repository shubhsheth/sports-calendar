import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "./mapWithConcurrency.ts";

describe("mapWithConcurrency", () => {
  it("never exceeds the concurrency limit and saturates it", async () => {
    const limit = 3;
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    const results = await mapWithConcurrency(items, limit, async n => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      inFlight--;
      return n * 2;
    });

    expect(maxInFlight).toBeLessThanOrEqual(limit);
    // With 10 items and a limit of 3, all 3 slots should be busy at once.
    expect(maxInFlight).toBe(limit);
    expect(results).toEqual(items.map(n => n * 2));
  });

  it("preserves input order regardless of completion order", async () => {
    const items = [30, 5, 15];
    const results = await mapWithConcurrency(items, 3, async ms => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return ms;
    });
    expect(results).toEqual([30, 5, 15]);
  });

  it("handles an empty array and a limit larger than the item count", async () => {
    expect(await mapWithConcurrency([], 8, async x => x)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 8, async x => x * 10)).toEqual([
      10, 20,
    ]);
  });
});
