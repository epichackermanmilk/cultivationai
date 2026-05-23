import { NextResponse } from 'next/server'

const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY

export async function GET() {
  if (!VPS_BASE) {
    return NextResponse.json({ error: 'VPS_API_URL not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${VPS_BASE}/novels`, {
      headers: { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `VPS error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()

    // VPS returns { novels: [...] } — normalise to array
    const novels = Array.isArray(data) ? data : (data.novels ?? [])
    return NextResponse.json(novels)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
