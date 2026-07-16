/**
 * Small, bounded, best-effort limiter for public route handlers.
 *
 * This intentionally lives in process memory so it adds no paid dependency.
 * A hosting-provider/edge limiter should replace it when traffic warrants one:
 * serverless instances do not share this map and a proxy must sanitize client
 * address headers before they are trusted.
 */
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RequestRateLimitOptions = {
  namespace: string;
  limit: number;
  windowMs: number;
  maxEntries?: number;
};

export type RequestRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

const DEFAULT_MAX_ENTRIES = 5_000;

const rateLimitGlobal = globalThis as typeof globalThis & {
  __socializeRequestRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimits =
  rateLimitGlobal.__socializeRequestRateLimits ?? new Map<string, RateLimitEntry>();
rateLimitGlobal.__socializeRequestRateLimits = rateLimits;

function boundedHeaderValue(value: string | null) {
  return value?.trim().slice(0, 128) ?? "";
}

/**
 * Prefer headers set by known hosting proxies. `x-forwarded-for` is only a
 * compatibility fallback; deployments should ensure their proxy overwrites it.
 */
export function requestClientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-real-ip"),
    forwarded,
  ];

  return candidates.map(boundedHeaderValue).find(Boolean) ?? "unknown";
}

function pruneRateLimits(now: number, maxEntries: number) {
  if (rateLimits.size < maxEntries) return;

  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }

  while (rateLimits.size >= maxEntries) {
    const oldestKey = rateLimits.keys().next().value as string | undefined;
    if (!oldestKey) break;
    rateLimits.delete(oldestKey);
  }
}

export function consumeRequestRateLimit(
  request: Request,
  options: RequestRateLimitOptions,
): RequestRateLimitResult {
  const now = Date.now();
  const maxEntries = Math.max(100, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
  pruneRateLimits(now, maxEntries);

  const key = `${options.namespace}:${requestClientAddress(request)}`;
  const current = rateLimits.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

  entry.count += 1;
  rateLimits.set(key, entry);

  return {
    allowed: entry.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - entry.count),
    resetAt: entry.resetAt,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)),
  };
}

export function requestRateLimitHeaders(result: RequestRateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  };
}

export const PUBLIC_METADATA_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
export const NO_STORE_CACHE_CONTROL = "no-store";
