import "server-only";

/**
 * Simple in-process token-bucket rate limiter for intake-style endpoints
 * (upload, RFQ create, login). Good enough for a single-instance MVP.
 * In production behind multiple instances, back this with Redis/Upstash
 * instead of an in-memory Map.
 */
interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const refillRate = opts.limit / opts.windowMs;
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { tokens: opts.limit - 1, updatedAt: now });
    return { allowed: true, remaining: opts.limit - 1, retryAfterMs: 0 };
  }

  const elapsed = now - existing.updatedAt;
  const refilled = Math.min(opts.limit, existing.tokens + elapsed * refillRate);

  if (refilled < 1) {
    const msUntilNextToken = (1 - refilled) / refillRate;
    buckets.set(key, { tokens: refilled, updatedAt: now });
    return { allowed: false, remaining: 0, retryAfterMs: Math.ceil(msUntilNextToken) };
  }

  buckets.set(key, { tokens: refilled - 1, updatedAt: now });
  return { allowed: true, remaining: Math.floor(refilled - 1), retryAfterMs: 0 };
}

// Periodically prune stale buckets so this doesn't grow unbounded in a
// long-running process.
setInterval(
  () => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [key, bucket] of buckets) {
      if (bucket.updatedAt < cutoff) buckets.delete(key);
    }
  },
  10 * 60 * 1000,
).unref?.();
