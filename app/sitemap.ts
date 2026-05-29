import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://novelcodex.org'

// Fetches the novel list to generate dynamic sitemap entries.
// Falls back to static pages only if the VPS is unreachable.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,          lastModified: new Date(), changeFrequency: 'daily',   priority: 1 },
    { url: `${BASE_URL}/chat`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  try {
    const res = await fetch(`${BASE_URL}/api/novels`, {
      next: { revalidate: 86400 }, // cache for 24h
    })
    if (!res.ok) return staticPages

    const novels: Array<{ slug: string }> = await res.json()
    const novelEntries: MetadataRoute.Sitemap = (Array.isArray(novels) ? novels : []).map(n => ({
      url:             `${BASE_URL}/novel/${n.slug}`,
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))

    return [...staticPages, ...novelEntries]
  } catch {
    return staticPages
  }
}
