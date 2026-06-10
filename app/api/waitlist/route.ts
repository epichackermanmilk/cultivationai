import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const audienceId = process.env.RESEND_AUDIENCE_ID
    if (!apiKey || !audienceId) {
      return NextResponse.json({ ok: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId,
    })

    await resend.emails.send({
      from: 'NovelCodex <noreply@novelcodex.org>',
      to: email,
      subject: "You're on the NovelCodex waitlist",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 24px;">
          <span style="font-size:22px;font-weight:800;color:#f59e0b;letter-spacing:-0.5px;">NovelCodex</span>
        </td></tr>
        <tr><td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:36px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#fafafa;">You're on the list.</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#a1a1aa;">
            We'll notify you when new novels go live on NovelCodex. In the meantime, check out the novels already available.
          </p>
          <a href="https://novelcodex.org/library"
            style="display:inline-block;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%);color:#000;font-weight:800;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:100px;">
            Browse Library
          </a>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#52525b;">
            <a href="https://novelcodex.org/unsubscribe?email=${encodeURIComponent(email)}" style="color:#52525b;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
