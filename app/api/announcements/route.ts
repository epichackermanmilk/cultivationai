// GET /api/announcements — published site announcements for the homepage.
// Server-side via the service key. Degrades to an empty list until the table exists.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  try {
    const sb = admin()
    const { data, error } = await sb
      .from('announcements')
      .select('id, title, body, pinned, created_at')
      .eq('published', true)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12)
    if (error) return NextResponse.json({ announcements: [] })
    return NextResponse.json({ announcements: data ?? [] }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } })
  } catch {
    return NextResponse.json({ announcements: [] })
  }
}
