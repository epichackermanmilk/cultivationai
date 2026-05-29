import { NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/sanitize'
import { appendFileSync } from 'fs'
import { join } from 'path'

const SUPPORT_LOG  = join(process.cwd(), '..', 'output', 'support_messages.log')
const RESEND_KEY   = process.env.RESEND_API_KEY   // re_xxxxxxxxxxxx
const SUPPORT_TO   = process.env.SUPPORT_TO_EMAIL  // your inbox, e.g. your@gmail.com
const FROM_EMAIL   = 'NovelCodex Support <support@novelcodex.org>'

async function sendViaResend(entry: {
  ts: string; email: string; category: string; subject: string; message: string
}) {
  if (!RESEND_KEY || !SUPPORT_TO) return  // silently skip if not configured

  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [SUPPORT_TO],
      // Reply-to is the user's email so you can reply directly from your inbox
      reply_to: entry.email,
      subject: `[NovelCodex Support] [${entry.category}] ${entry.subject}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="background:#18181b;border-radius:12px;padding:24px;color:#fafafa;border:1px solid #27272a">
            <h2 style="color:#fbbf24;margin:0 0 16px">New Support Message</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#a1a1aa;width:100px">From</td>
                  <td style="padding:6px 0">${entry.email}</td></tr>
              <tr><td style="padding:6px 0;color:#a1a1aa">Category</td>
                  <td style="padding:6px 0"><span style="background:#fbbf2420;color:#fbbf24;padding:2px 8px;border-radius:999px;font-size:12px">${entry.category}</span></td></tr>
              <tr><td style="padding:6px 0;color:#a1a1aa">Subject</td>
                  <td style="padding:6px 0;font-weight:600">${entry.subject}</td></tr>
              <tr><td style="padding:6px 0;color:#a1a1aa">Time</td>
                  <td style="padding:6px 0;color:#71717a;font-size:12px">${entry.ts}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #27272a;margin:16px 0" />
            <div style="background:#09090b;border-radius:8px;padding:16px;color:#d4d4d8;font-size:14px;line-height:1.6;white-space:pre-wrap">${entry.message}</div>
            <p style="margin:16px 0 0;font-size:12px;color:#52525b">
              Reply directly to this email to respond to ${entry.email}.
            </p>
          </div>
        </div>
      `,
      text: `New support message from ${entry.email}\n\nCategory: ${entry.category}\nSubject: ${entry.subject}\nTime: ${entry.ts}\n\n${entry.message}`,
    }),
  })
}

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

  const entry = {
    ts:       new Date().toISOString(),
    email:    email.trim(),
    category: typeof category === 'string' ? category : 'Other',
    subject:  subject.trim().slice(0, 120),
    message:  message.trim().slice(0, 2000),
  }

  // Always log to file (guaranteed, free backup)
  try {
    appendFileSync(SUPPORT_LOG, JSON.stringify(entry) + '\n')
  } catch { /* non-fatal */ }

  // Send via Resend if configured
  try {
    await sendViaResend(entry)
  } catch { /* non-fatal — message is still logged */ }

  return NextResponse.json({ ok: true })
}
