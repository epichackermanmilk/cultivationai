// lib/ga4.ts
// Server-side GA4 Measurement Protocol — fires precise `purchase` events with
// real dollar amounts from the Stripe webhook (the client-side gtag event on
// the success page can't know the exact value).
//
// Setup needed (one-time, in your GA4 dashboard):
//   Admin → Data Streams → (web stream) → Measurement Protocol API secrets
//   → Create secret → copy the value into env var GA4_API_SECRET on the VPS.
// The Measurement ID (G-RN9SR0DZ6R) is already known.
//
// No-ops silently if GA4_API_SECRET is not set.

const GA4_MEASUREMENT_ID = 'G-RN9SR0DZ6R'

interface PurchaseArgs {
  userId:        string
  transactionId: string
  valueUsd:      number      // dollars (e.g. 9.99)
  tier:          string      // 'Story' | 'Scholar' | 'AdFree' | …
  mode:          string      // 'once' | 'sub' | 'addon'
}

export async function trackPurchase(args: PurchaseArgs): Promise<void> {
  const secret = process.env.GA4_API_SECRET
  if (!secret) return  // not configured — skip

  const body = {
    // GA4 needs a client_id; using the user id keeps purchases attributed to
    // a stable identity even without the browser GA cookie.
    client_id: args.userId,
    user_id:   args.userId,
    events: [{
      name: 'purchase',
      params: {
        transaction_id: args.transactionId,
        currency:       'USD',
        value:          args.valueUsd,
        items: [{
          item_id:   args.tier,
          item_name: `NovelCodex ${args.tier}`,
          item_category: args.mode,
          price:     args.valueUsd,
          quantity:  1,
        }],
      },
    }],
  }

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${secret}`,
      { method: 'POST', body: JSON.stringify(body) },
    )
  } catch (e) {
    console.error('[ga4] purchase event failed:', e)
  }
}
