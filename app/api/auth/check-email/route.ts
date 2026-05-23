import { NextResponse } from 'next/server'
import { parseJsonBody, isValidEmail } from '@/lib/sanitize'

/**
 * POST /api/auth/check-email
 * Body: { email: string }
 * Response: { exists: boolean }
 *
 * Uses Supabase admin REST API to check if an account already exists.
 * Rate limited by middleware (5 auth attempts per 15 min per IP).
 */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 512)
  if (!parsed.ok)
    return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email: emailRaw } = parsed.data as { email?: unknown }
  if (!isValidEmail(emailRaw))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

  const email = (emailRaw as string).trim().toLowerCase()

  try {
    // Query Supabase admin users endpoint — the `filter` param does a text
    // search so we get at most a handful of results, then match exactly.
    const url = new URL(`${process.env.SUPABASE_URL}/auth/v1/admin/users`)
    url.searchParams.set('filter', email)
    url.searchParams.set('page',   '1')
    url.searchParams.set('per_page', '10')

    const res = await fetch(url.toString(), {
      headers: {
        apikey:        process.env.SUPABASE_SERVICE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
      },
    })

    if (!res.ok) {
      // Fail open — treat as "no account" so the user can proceed to signup
      return NextResponse.json({ exists: false })
    }

    const data = await res.json() as { users?: { email?: string }[] }
    const exists = Array.isArray(data.users) &&
      data.users.some(u => u.email?.toLowerCase() === email)

    return NextResponse.json({ exists })
  } catch {
    // Network / env error — fail open
    return NextResponse.json({ exists: false })
  }
}
