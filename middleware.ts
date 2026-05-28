import { NextResponse, type NextRequest } from 'next/server'

// ── Sliding-window rate-limit store (module-level, persists in Node process) ──
interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

function check(key: string, limit: number, windowMs: number): { ok: boolean; resetAt: number } {
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, resetAt: now + windowMs }
  }
  if (entry.count >= limit) return { ok: false, resetAt: entry.resetAt }
  entry.count++
  return { ok: true, resetAt: entry.resetAt }
}

// ── Route config ──────────────────────────────────────────────────────────────
const ROUTES: Array<{ test: (p: string) => boolean; limit: number; windowMs: number }> = [
  // Auth — tightest: 5 attempts per 15 min (brute-force protection)
  { test: p => /^\/api\/auth\/(login|signup)/.test(p), limit: 5,   windowMs: 15 * 60_000 },
  // Checkout — 6 per hour (prevents card-testing / abuse)
  { test: p => p.startsWith('/api/checkout'),           limit: 6,   windowMs: 60 * 60_000 },
  // Chat — 20 per minute (each call costs OpenAI money)
  { test: p => p.startsWith('/api/chat'),               limit: 20,  windowMs: 60_000 },
  // Embed — 10 per minute (triggers expensive VPS embedding job)
  { test: p => p.startsWith('/api/embed'),              limit: 10,  windowMs: 60_000 },
  // Support — 3 per 10 min (prevent spam submissions)
  { test: p => p.startsWith('/api/support'),            limit: 3,   windowMs: 10 * 60_000 },
  // Recommend — 10 per hour (costs 2 tokens + OpenAI call each time)
  { test: p => p.startsWith('/api/recommend'),          limit: 10,  windowMs: 60 * 60_000 },
  // Conversations — 60 per min (save after every chat exchange)
  { test: p => p.startsWith('/api/conversations'),      limit: 60,  windowMs: 60_000 },
  // General API catch-all
  { test: p => p.startsWith('/api/'),                   limit: 120, windowMs: 60_000 },
]

// Max body size per route prefix (bytes) — reject before route handler
const MAX_BODY: Record<string, number> = {
  '/api/auth/signup': 1_024,
  '/api/auth/login':  1_024,
  '/api/chat':        8_192,
  '/api/embed':       512,
  '/api/checkout':    256,
  '/api/support':           4_096,
  '/api/conversations':    16_384,
  '/api/recommend':           512,   // small body: {mode, slugs[], query}
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (!path.startsWith('/api/')) return NextResponse.next()

  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'anon'

  // Rate limit
  for (const route of ROUTES) {
    if (route.test(path)) {
      const key    = `rl:${ip}:${path.slice(0, 40)}`
      const result = check(key, route.limit, route.windowMs)
      if (!result.ok) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests — please slow down.' }),
          {
            status:  429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After':  String(retryAfter),
              'X-RateLimit-Reset': String(result.resetAt),
            },
          },
        )
      }
      break
    }
  }

  // Body size guard (checks Content-Length header before body is read)
  const maxBytes = Object.entries(MAX_BODY).find(([p]) => path.startsWith(p))?.[1]
  if (maxBytes) {
    const cl = Number(req.headers.get('content-length') ?? 0)
    if (cl > maxBytes) {
      return new NextResponse(
        JSON.stringify({ error: 'Request body too large.' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // Security headers on all API responses
  const res = NextResponse.next()
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options',        'DENY')
  res.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin')
  return res
}

export const config = { matcher: ['/api/:path*'] }
