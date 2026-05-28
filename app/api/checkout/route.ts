import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://novelcodex.org'

const ONE_TIME = [
  { label: 'Spark',   total: 100,   priceNum: 1     },
  { label: 'Story',   total: 550,   priceNum: 4.99  },
  { label: 'Novel',   total: 1200,  priceNum: 9.99  },
  { label: 'Library', total: 3500,  priceNum: 24.99 },
  { label: 'Saga',    total: 9250,  priceNum: 49.99 },
  { label: 'Titan',   total: 20000, priceNum: 99.99 },
]
const SUBS = [
  { label: 'Reader',  tokens: 700,  priceNum: 4.99 },
  { label: 'Scholar', tokens: 1600, priceNum: 9.99 },
]

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request) {
  // Verify session
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to purchase tokens' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Invalid session — please sign in again' }, { status: 401 })

  let body: { tier?: string; mode?: string }
  try { body = await req.json() } catch { body = {} }
  const { tier, mode } = body

  if (!tier || !mode) return NextResponse.json({ error: 'Missing tier or mode' }, { status: 400 })

  try {
    if (mode === 'once') {
      const t = ONE_TIME.find(t => t.label === tier)
      if (!t) return NextResponse.json({ error: 'Unknown tier' }, { status: 400 })

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `NovelCodex ${t.label} — ${t.total.toLocaleString()} tokens`,
              description: `${t.total.toLocaleString()} tokens, never expire. Use across any novel.`,
            },
            unit_amount: Math.round(t.priceNum * 100),
          },
          quantity: 1,
        }],
        metadata: {
          user_id: user.id,
          user_email: user.email ?? '',
          tokens: t.total.toString(),
          mode: 'once',
          tier: t.label,
        },
        customer_email: user.email,
        success_url: `${BASE}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE}/shop`,
      })

      return NextResponse.json({ url: session.url })
    }

    if (mode === 'sub') {
      const s = SUBS.find(s => s.label === tier)
      if (!s) return NextResponse.json({ error: 'Unknown subscription tier' }, { status: 400 })

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `NovelCodex ${s.label} Plan`,
              description: `${s.tokens.toLocaleString()} tokens every month. Cancel anytime.`,
            },
            unit_amount: Math.round(s.priceNum * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        // Store token amount in subscription metadata so webhook can credit per cycle
        subscription_data: {
          metadata: {
            user_id: user.id,
            tokens: s.tokens.toString(),
            tier: s.label,
          },
        },
        metadata: {
          user_id: user.id,
          tokens: s.tokens.toString(),
          mode: 'sub',
          tier: s.label,
        },
        customer_email: user.email,
        success_url: `${BASE}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE}/shop`,
      })

      return NextResponse.json({ url: session.url })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    console.error('Checkout error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
