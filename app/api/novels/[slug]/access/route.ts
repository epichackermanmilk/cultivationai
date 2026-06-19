// GET /api/novels/[slug]/access — lock summary for a novel + the caller's access.
// { total, lockThreshold, subscribed, unlocked: number[] }. Powers lock badges on
// the detail page and the reader's paywall.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getNovelMeta } from '@/lib/vps'
import { lockThreshold } from '@/lib/locks'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const meta = await getNovelMeta(slug).catch(() => null)
  const total = meta?.total_chapters ?? 0
  const threshold = lockThreshold(total)

  let subscribed = false
  let unlocked: number[] = []
  const token = (await cookies()).get('nc_session')?.value
  if (token) {
    const sb = admin()
    const { data: { user } } = await sb.auth.getUser(token)
    if (user) {
      const { data: prof } = await sb.from('profiles').select('subscription_active').eq('id', user.id).maybeSingle()
      subscribed = !!prof?.subscription_active
      const { data: rows } = await sb.from('chapter_unlocks').select('chapter_number').eq('user_id', user.id).eq('slug', slug)
      unlocked = (rows ?? []).map(r => r.chapter_number as number)
    }
  }
  return NextResponse.json({ total, lockThreshold: threshold, subscribed, unlocked })
}
