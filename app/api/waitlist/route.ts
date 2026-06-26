import { NextResponse } from 'next/server'
import { renderEmail } from '@/lib/email'

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
      html: renderEmail({
        heading: 'You\'re on the list.',
        intro: 'Thanks for joining the NovelCodex waitlist — we\'ll email you when new novels go live. In the meantime, thousands are already free to read.',
        ctaText: 'Start reading',
        ctaUrl: 'https://novelcodex.org/browse',
        unsubscribeEmail: email,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
