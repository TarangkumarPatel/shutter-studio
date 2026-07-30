/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: this resets on server restart and is per-instance — fine for a
 * single-server deployment (Vercel single region / a VPS), but not a
 * distributed rate limit. For multi-instance deployments, swap this for a
 * shared store (e.g. Upstash Redis) behind the same `checkRateLimit` API.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

// Periodically clear out long-idle buckets so this Map doesn't grow forever.
const CLEANUP_INTERVAL_MS = 1000 * 60 * 10;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - oldest) };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.timestamps.length, retryAfterMs: 0 };
}
