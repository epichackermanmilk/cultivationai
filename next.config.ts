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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-eval for HMR
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://api.openai.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig;
