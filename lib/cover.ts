// Cover image helper. Third-party cover CDNs (novelbuddy/novelbin/novelfire) are
// slow on mobile and cause grey boxes. Route them through our own /api/cover proxy,
// which resizes to a thumbnail (webp) and is cached at Cloudflare's edge — so covers
// load fast from our domain instead of slow third parties. Self-hosted covers
// (novelcodex.org/covers) and anything else pass through untouched.

export const PROXY_HOSTS = new Set([
  'static.novelbuddy.com',
  'images.novelbin.me',
  'novelfire.net',
  'www.novelfire.net',
])

export function coverSrc(url: string | undefined | null, w = 360): string {
  if (!url) return ''
  try {
    if (PROXY_HOSTS.has(new URL(url).hostname)) {
      return `/api/cover?u=${encodeURIComponent(url)}&w=${w}`
    }
  } catch { /* not a URL — return as-is */ }
  return url
}
