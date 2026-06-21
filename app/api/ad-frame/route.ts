// GET /api/ad-frame?key=<zone>&w=<width>&h=<height>
// Serves a single Adsterra banner as a real same-origin HTML document, used as the
// src of an <iframe> in AdsterraBanner. A real document URL (vs. srcDoc) is required:
// Adsterra's invoke.js is loaded protocol-relative and its document.write only works
// in a normally-navigated frame — srcDoc has no origin, so the script never loads.
// Only our own configured zone keys are allowed (no open ad-frame relay).

import { NextRequest, NextResponse } from 'next/server'
import { ADSTERRA } from '@/lib/ads'

const ALLOWED = new Set(Object.values(ADSTERRA).map(z => z.key).filter(Boolean))

export function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? ''
  const w = Math.max(1, Math.min(970, parseInt(req.nextUrl.searchParams.get('w') || '0', 10) || 0))
  const h = Math.max(1, Math.min(600, parseInt(req.nextUrl.searchParams.get('h') || '0', 10) || 0))
  if (!/^[a-f0-9]{16,64}$/.test(key) || !ALLOWED.has(key) || !w || !h) {
    return new NextResponse('not found', { status: 404 })
  }

  const html =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head>` +
    `<body>` +
    `<script type="text/javascript">atOptions={'key':'${key}','format':'iframe','height':${h},'width':${w},'params':{}};</script>` +
    `<script type="text/javascript" src="https://www.highperformanceformat.com/${key}/invoke.js"></script>` +
    `</body></html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
