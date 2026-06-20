// POST /api/reads { slug, chapter } — log a chapter read (best-effort, fire-and-forget
// from the reader). Feeds the homepage Popular / Trending rankings. Never blocks the
// reader and degrades silently if the novel_reads table hasn't been created yet.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  const { slug, chapter } = await req.json().catch(() => ({})) as { slug?: string; chapter?: number }
  if (!slug) return NextResponse.json({ ok: false })
  const sb = admin()
  let user_id: string | null = null
  try {
    const token = (await cookies()).get('nc_session')?.value
    if (token) { const { data: { user } } = await sb.auth.getUser(token); user_id = user?.id ?? null }
  } catch { /* ignore */ }
  try { await sb.from('novel_reads').insert({ slug, chapter: chapter ?? null, user_id }) } catch { /* table missing */ }
  return NextResponse.json({ ok: true })
}
