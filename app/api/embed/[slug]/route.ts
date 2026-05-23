import { isNovelEmbedded } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const VPS_BASE = process.env.VPS_API_URL
const VPS_KEY  = process.env.VPS_API_KEY
const vpsHeaders = { 'X-Api-Key': VPS_KEY!, 'Content-Type': 'application/json' }

async function vpsPost(path: string) {
  if (!VPS_BASE) throw new Error('No VPS_API_URL')
  const res = await fetch(`${VPS_BASE}${path}`, { method: 'POST', headers: vpsHeaders })
  return res.json()
}

async function vpsGet(path: string) {
  if (!VPS_BASE) throw new Error('No VPS_API_URL')
  const res = await fetch(`${VPS_BASE}${path}`, { headers: vpsHeaders })
  return res.json()
}

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const result = await vpsPost(`/embed/${slug}`)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    // Ground truth: check Supabase
    const embedded = await isNovelEmbedded(slug)
    if (embedded) return NextResponse.json({ embedded: true, status: 'done' })

    // Try VPS for in-progress status
    try {
      const vpsStatus = await vpsGet(`/status/${slug}`)
      return NextResponse.json({ embedded: false, ...vpsStatus })
    } catch {
      return NextResponse.json({ embedded: false, status: 'not_started' })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
