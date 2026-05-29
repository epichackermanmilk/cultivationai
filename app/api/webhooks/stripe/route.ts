import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Lazily initialised so the build doesn't fail when STRIPE_SECRET_KEY is absent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
  return _stripe
}

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function creditTokens(userId: string, tokens: number, reference: string) {
  const sb = admin()

  // Idempotency: skip if this reference was already processed
  const { data: existing } = await sb
    .from('token_purchases')
    .select('id')
    .eq('stripe_reference', reference)
    .maybeSingle()
  if (existing) return

  // Get current balance and add tokens
  const { data: profile } = await sb.from('profiles').select('tokens').eq('id', userId).single()
  const current = (profile?.tokens as number) ?? 0

  await sb.from('profiles').update({ tokens: current + tokens }).eq('id', userId)

  // Record the transaction (best-effort — table may not exist yet)
  try {
    await sb.from('token_purchases').insert({
      user_id:          userId,
      tokens_added:     tokens,
      stripe_reference: reference,
      created_at:       new Date().toISOString(),
    })
  } catch { /* ok */ }
}

// Required: raw body for Stripe signature verification
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const payload = Buffer.from(await req.arrayBuffer())
  const sig     = req.headers.get('stripe-signature')
  const secret  = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  try {
    event = getStripe().webhooks.constructEvent(payload, sig, secret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    // ── One-time purchase completed ──────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { user_id, tokens, mode } = (session.metadata ?? {}) as Record<string, string>

      if (user_id && tokens && mode === 'once') {
        await creditTokens(user_id, parseInt(tokens, 10), session.id)
      }
    }

    // ── Subscription renewal — credit tokens each month ──────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string; billing_reason?: string }
      // Only credit on renewal, not on the first (checkout.session.completed handles that)
      if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
        const sub = await getStripe().subscriptions.retrieve(invoice.subscription)
        const { user_id, tokens } = (sub.metadata ?? {}) as Record<string, string>
        if (user_id && tokens) {
          await creditTokens(user_id, parseInt(tokens, 10), invoice.id)
        }
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err)
    // Return 200 so Stripe doesn't retry infinitely
  }

  return NextResponse.json({ received: true })
}
