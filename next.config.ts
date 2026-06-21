import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Restrict to known novel-image CDN hostnames
    remotePatterns: [
      { protocol: 'https', hostname: '**.novelbin.me' },
      { protocol: 'https', hostname: '**.novelbuddy.io' },
      { protocol: 'https', hostname: '**.novellive.net' },
      { protocol: 'https', hostname: '**.novelfire.net' },
      { protocol: 'https', hostname: '**.wuxiaworld.com' },
      { protocol: 'https', hostname: '**.lightnovelworld.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.cdnjs.com' },
      // Fallback for other CDN hosts — still restricts to HTTPS
      { protocol: 'https', hostname: '**.cdn.**' },
      { protocol: 'https', hostname: 'static.**' },
    ],
    // Reasonable size limits
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes:  [64, 128, 256, 384],
  },
  experimental: {},

  // Permanent redirects for renamed novel slugs (old truncated → full-title slug)
  async redirects() {
    return [
      {
        source: '/novel/heavens-proud-daughters-please-return-my',
        destination: '/novel/heavens-proud-daughters-please-return-my-happy-ending-to-me',
        permanent: true,
      },
      // ── Test → production migration (the test designs are now the live pages) ──
      { source: '/testnewlibrary', destination: '/', permanent: true },
      { source: '/testnewlibrary/:path*', destination: '/novel/:path*', permanent: true },
      { source: '/testnovel/:slug', destination: '/novel/:slug/chat', permanent: true },
      { source: '/testbrowse', destination: '/browse', permanent: true },
      { source: '/testcharacters', destination: '/characters', permanent: true },
      { source: '/testgames', destination: '/games', permanent: true },
      { source: '/testrecommend', destination: '/recommend', permanent: true },
      { source: '/testbookmarks', destination: '/bookmarks', permanent: true },
      { source: '/testprofile', destination: '/profile', permanent: true },
      { source: '/testshop', destination: '/shop', permanent: true },
      { source: '/testlogin', destination: '/login', permanent: true },
      { source: '/api/testnewlibrary/chapters/:slug', destination: '/api/chapters/:slug', permanent: true },
      // The old catalogue lives at /browse now
      { source: '/library', destination: '/browse', permanent: true },
    ]
  },

  // Security headers
  async headers() {
    // The ad sandbox (/api/ad-frame) gets its OWN loose CSP: it's an isolated iframe
    // containing only the third-party ad, and ad networks load creatives/trackers from
    // many rotating domains that can't be enumerated. It must be framable same-origin.
    const adFrameCsp = [
      "default-src 'self' https: data: blob:",
      "script-src 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'unsafe-inline' https:",
      "img-src https: data: blob:",
      "frame-src https:",
      "connect-src https:",
    ].join('; ')

    const strictCsp = [
      "default-src 'self'",
      // Next.js requires unsafe-eval in dev; Google Analytics/AdSense + Cloudflare RUM
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.google-analytics.com https://js.stripe.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      // Analytics, AdSense, Supabase, Stripe, Cloudflare RUM
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://region1.google-analytics.com https://www.google-analytics.com https://stats.g.doubleclick.net https://pagead2.googlesyndication.com https://api.stripe.com https://cloudflareinsights.com",
      "font-src 'self' https://fonts.gstatic.com",
      // AdSense iframes + our own same-origin ad-frame sandbox
      "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://js.stripe.com",
      "frame-ancestors 'none'",
      "worker-src blob:",
    ].join('; ')

    return [
      {
        source: '/api/ad-frame',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: adFrameCsp },
        ],
      },
      {
        // Everything except the ad sandbox gets the strict policy.
        source: '/((?!api/ad-frame).*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy',  value: strictCsp },
        ],
      },
    ]
  },
}

export default nextConfig;
