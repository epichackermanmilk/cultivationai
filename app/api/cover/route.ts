import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { PROXY_HOSTS } from '@/lib/cover'

// GET /api/cover?u=<external cover url>&w=<width>
// Fetches a whitelisted third-party cover, resizes to a webp thumbnail, and serves
// it with a 1-year immutable cache so Cloudflare caches it at the edge. This turns
// slow third-party image loads into fast, same-origin, CDN-cached ones.

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u')
  const w = Math.min(600, Math.max(80, parseInt(req.nextUrl.searchParams.get('w') || '360', 10) || 360))
  if (!u) return new NextResponse('missing u', { status: 400 })

  let parsed: URL
  try { parsed = new URL(u) } catch { return new NextResponse('bad url', { status: 400 }) }
  // SSRF guard: only proxy known cover hosts over https.
  if (parsed.protocol !== 'https:' || !PROXY_HOSTS.has(parsed.hostname)) {
    return new NextResponse('host not allowed', { status: 403 })
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': `https://${parsed.hostname}/` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return new NextResponse('upstream ' + res.status, { status: 502 })

    const input = Buffer.from(await res.arrayBuffer())
    let body: Buffer
    let contentType = 'image/webp'
    try {
      body = await sharp(input).resize(w, null, { withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()
    } catch {
      // Not an image sharp can decode — serve the original bytes.
      body = input
      contentType = res.headers.get('content-type') || 'image/jpeg'
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type':       contentType,
        'Cache-Control':      'public, max-age=31536000, immutable',
        'CDN-Cache-Control':  'public, max-age=31536000',
      },
    })
  } catch {
    return new NextResponse('fetch failed', { status: 502 })
  }
}
