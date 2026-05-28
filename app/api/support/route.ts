import { NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/sanitize'
import { appendFileSync } from 'fs'
import { join } from 'path'

// Log support messages to a file on the VPS for now.
// Replace with a real email service (Resend, SendGrid, etc.) once integrated.
const SUPPORT_LOG = join(process.cwd(), '..', 'output', 'support_messages.log')

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, 4096)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { email, category, subject, message } = parsed.data as {
    email?: unknown; category?: unknown; subject?: unknown; message?: unknown
  }

  if (typeof email !== 'string' || !email.includes('@'))
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  if (typeof subject !== 'string' || subject.trim().length < 3)
    return NextResponse.json({ error: 'Subject too short' }, { status: 400 })
  if (typeof message !== 'string' || message.trim().length < 10)
    return NextResponse.json({ error: 'Message too short' }, { status: 400 })

  const entry = JSON.stringify({
    ts:       new Date().toISOString(),
    email:    email.trim(),
    category: typeof category === 'string' ? category : 'Other',
    subject:  subject.trim().slice(0, 120),
    message:  message.trim().slice(0, 2000),
  }) + '\n'

  try {
    appendFileSync(SUPPORT_LOG, entry)
  } catch { /* non-fatal if output dir doesn't exist */ }

  return NextResponse.json({ ok: true })
}
