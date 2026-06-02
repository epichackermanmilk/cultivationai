import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { syncDiscordRoles } from '@/lib/discord'
import { trackPurchase }    from '@/lib/ga4'

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
  const { data: profile } = await sb.from('profiles').select('tokens, tokens_ever_purchased').eq('id', userId).single()
  const current      = (profile?.tokens as number) ?? 0
  const everPurchased = (profile?.tokens_ever_purchased as number) ?? 0

  await sb.from('profiles').update({
    tokens:                current + tokens,
    tokens_ever_purchased: everPurchased + tokens,
  }).eq('id', userId)

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
  // Accept the live secret AND (optionally) one or more comma-separated test-mode
  // secrets, so we can run an end-to-end test purchase without swapping production
  // into test mode. We try each until the signature verifies.
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    ...(process.env.STRIPE_WEBHOOK_SECRET_TEST ?? '').split(',').map(s => s.trim()),
  ].filter((s): s is string => !!s)

  let event: Stripe.Event

  if (secrets.length === 0) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let verified: Stripe.Event | null = null
  let lastErr = 'Webhook signature verification failed'
  for (const secret of secrets) {
    try {
      verified = getStripe().webhooks.constructEvent(payload, sig, secret)
      break
    } catch (err: unknown) {
      lastErr = err instanceof Error ? err.message : lastErr
    }
  }
  if (!verified) {
    return NextResponse.json({ error: lastErr }, { status: 400 })
  }
  event = verified

  try {
    // ── One-time purchase + add-on completed ─────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { user_id, tokens, mode, tier } = (session.metadata ?? {}) as Record<string, string>

      // Fire a precise GA4 purchase event (real $ value) for any completed checkout
      if (user_id && session.amount_total) {
        trackPurchase({
          userId:        user_id,
          transactionId: session.id,
          valueUsd:      session.amount_total / 100,   // cents → dollars
          tier:          tier ?? 'unknown',
          mode:          mode ?? 'unknown',
        }).catch(() => {})
      }

      if (user_id && mode === 'once' && tokens) {
        await creditTokens(user_id, parseInt(tokens, 10), session.id)
        syncDiscordRoles(user_id).catch(() => {})
      }

      // Subscription initial payment — also credit tokens + mark sub active
      if (user_id && mode === 'sub' && tokens) {
        await creditTokens(user_id, parseInt(tokens, 10), session.id)
        const sb = admin()
        const subTier = (session.metadata?.tier as string | undefined)?.toLowerCase() ?? null
        await sb.from('profiles').update({ subscription_active: true, ads_disabled: true, subscription_tier: subTier }).eq('id', user_id)
        syncDiscordRoles(user_id).catch(() => {})
      }

      // Ad-free add-on purchase
      if (user_id && mode === 'addon' && tier === 'AdFree') {
        const sb = admin()
        await sb.from('profiles').update({ ads_disabled: true }).eq('id', user_id)
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
          // Ensure sub active flag is set (may have been cleared if sub lapsed)
          const sb = admin()
          await sb.from('profiles').update({ subscription_active: true, ads_disabled: true }).eq('id', user_id)
          syncDiscordRoles(user_id).catch(() => {})
        }
      }
    }

    // ── Subscription cancelled / expired ─────────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const { user_id } = (sub.metadata ?? {}) as Record<string, string>
      if (user_id) {
        const sb = admin()
        // Only clear subscription_active — ads_disabled stays true if they bought it separately
        await sb.from('profiles').update({ subscription_active: false, subscription_tier: null }).eq('id', user_id)
        syncDiscordRoles(user_id).catch(() => {})
        // If they didn't buy ad-free separately, re-enable ads
        const { data: profile } = await sb.from('profiles').select('ads_disabled').eq('id', user_id).maybeSingle()
        // ads_disabled stays if they specifically purchased it (we can't tell here easily).
        // Conservative: leave ads_disabled as-is; admins can manually clear if needed.
        void profile // suppress unused warning
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err)
    // Return 200 so Stripe doesn't retry infinitely
  }

  return NextResponse.json({ received: true })
}
