import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { PROXY_HOSTS } from '@/lib/cover'
import { createHash } from 'crypto'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// GET /api/cover?u=<external cover url>&w=<width>
// Fetches a whitelisted third-party cover, resizes to a webp thumbnail, and caches
// the result on disk so repeat requests are a cheap disk read (no re-fetch/resize).
// Cloudflare treats /api/* as dynamic, so the disk cache is what keeps this fast.

export const runtime = 'nodejs'
const CACHE_DIR = '/root/cover-cache'

const HEADERS = {
  'Cache-Control':     'public, max-age=31536000, immutable',
  'CDN-Cache-Control': 'public, max-age=31536000',
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u')
  const w = Math.min(600, Math.max(80, parseInt(req.nextUrl.searchParams.get('w') || '360', 10) || 360))
  if (!u) return new NextResponse('missing u', { status: 400 })

  let parsed: URL
  try { parsed = new URL(u) } catch { return new NextResponse('bad url', { status: 400 }) }
  if (parsed.protocol !== 'https:' || !PROXY_HOSTS.has(parsed.hostname)) {
    return new NextResponse('host not allowed', { status: 403 })
  }

  const key  = createHash('sha1').update(`${parsed.toString()}|${w}`).digest('hex')
  const file = join(CACHE_DIR, key + '.webp')

  // ── Disk cache hit ──────────────────────────────────────────────────────────
  try {
    const cached = await readFile(file)
    return new NextResponse(new Uint8Array(cached), {
      status: 200,
      headers: { ...HEADERS, 'Content-Type': 'image/webp', 'X-Cover-Cache': 'HIT' },
    })
  } catch { /* miss — fall through */ }

  // ── Fetch + resize ──────────────────────────────────────────────────────────
  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': `https://${parsed.hostname}/` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return new NextResponse('upstream ' + res.status, { status: 502 })

    const input = Buffer.from(await res.arrayBuffer())
    try {
      const body = await sharp(input).resize(w, null, { withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()
      try { await mkdir(CACHE_DIR, { recursive: true }); await writeFile(file, body) } catch { /* cache best-effort */ }
      return new NextResponse(new Uint8Array(body), {
        status: 200,
        headers: { ...HEADERS, 'Content-Type': 'image/webp', 'X-Cover-Cache': 'MISS' },
      })
    } catch {
      // Not an image sharp can decode — serve original bytes uncached.
      return new NextResponse(new Uint8Array(input), {
        status: 200,
        headers: { ...HEADERS, 'Content-Type': res.headers.get('content-type') || 'image/jpeg', 'X-Cover-Cache': 'PASS' },
      })
    }
  } catch {
    return new NextResponse('fetch failed', { status: 502 })
  }
}
