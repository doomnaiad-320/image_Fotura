import LRUCache from "lru-cache";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  prefix?: string;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

export function createRateLimiter({ windowMs, max, prefix = "rl" }: RateLimitOptions) {
  const cache = new LRUCache<string, { hits: number; reset: number }>({
    max: 10_000,
    ttl: windowMs,
    ttlAutopurge: true
  });

  return {
    check(key: string): RateLimitResult {
      const cacheKey = `${prefix}:${key}`;
      const now = Date.now();
      const entry = cache.get(cacheKey);

      if (!entry) {
        cache.set(cacheKey, { hits: 1, reset: now + windowMs });
        return {
          success: true,
          remaining: max - 1,
          reset: now + windowMs
        };
      }

      if (entry.hits >= max) {
        return {
          success: false,
          remaining: 0,
          reset: entry.reset
        };
      }

      entry.hits += 1;
      cache.set(cacheKey, entry);

      return {
        success: true,
        remaining: max - entry.hits,
        reset: entry.reset
      };
    }
  };
}
