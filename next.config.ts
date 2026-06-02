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
    ]
  },

  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
          {
            key:   'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires unsafe-eval in dev; Google Analytics/AdSense require external scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.google-analytics.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              // Analytics, AdSense, Supabase, Stripe
              "connect-src 'self' https://*.supabase.co https://api.openai.com https://region1.google-analytics.com https://www.google-analytics.com https://stats.g.doubleclick.net https://pagead2.googlesyndication.com https://api.stripe.com",
              "font-src 'self' https://fonts.gstatic.com",
              // AdSense serves ads in iframes
              "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://js.stripe.com",
              "frame-ancestors 'none'",
              // AdSense requires sandbox workers
              "worker-src blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig;
