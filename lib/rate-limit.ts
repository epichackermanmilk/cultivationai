/**
 * In-process sliding-window rate limiter.
 * Suitable for single-instance Next.js (our PM2 cluster=1 setup).
 * For multi-instance, swap the Map for a Redis/Upstash store.
 */

interface WindowEntry {
  count:     number
  resetAt:   number
}

const store = new Map<string, WindowEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitResult {
  success:   boolean
  remaining: number
  resetAt:   number
}

/**
 * @param key     Unique identifier (e.g. "ip:1.2.3.4:route")
 * @param limit   Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now    = Date.now()
  const entry  = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Fresh window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Helper: read client IP from Next.js request headers.
 * Handles X-Forwarded-For (Nginx proxy) and cf-connecting-ip (Cloudflare).
 */
export function getClientIp(req: Request): string {
  const headers = req.headers
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  )
}

/** Returns a 429 Response */
export function tooManyRequests(resetAt: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down.' }),
    {
      status:  429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After':  String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(resetAt),
      },
    },
  )
}
