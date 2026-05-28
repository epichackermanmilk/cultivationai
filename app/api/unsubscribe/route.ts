import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody, isValidEmail } from '@/lib/sanitize'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// POST /api/unsubscribe — opt out by email (no auth required, industry standard)
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 512)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email: emailRaw } = parsed.data as { email?: unknown }
  if (!isValidEmail(emailRaw))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

  const email = emailRaw as string
  const sb = admin()

  // Find the profile by email and set consent to false
  const { error } = await sb
    .from('profiles')
    .update({ email_marketing_consent: false })
    .eq('email', email)

  if (error) {
    return NextResponse.json({ error: 'Could not process unsubscribe request' }, { status: 500 })
  }

  // Always return success — do not reveal whether the email exists
  return NextResponse.json({ ok: true })
}
