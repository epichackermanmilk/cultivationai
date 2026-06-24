import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://novelcodex.org'

// Fetches the novel list to generate dynamic sitemap entries.
// Falls back to static pages only if the VPS is unreachable.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1 },
    { url: `${BASE_URL}/browse`,      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/recommend`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/characters`,  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/games`,       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/shop`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/announcements`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${BASE_URL}/about`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/support`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE_URL}/terms`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ]

  try {
    const res = await fetch(`${BASE_URL}/api/novels`, {
      next: { revalidate: 86400 }, // cache for 24h
    })
    if (!res.ok) return staticPages

    const raw = await res.json()
    const novels: Array<{ slug: string; updated_at?: string }> = Array.isArray(raw) ? raw : (raw.novels ?? [])
    const novelEntries: MetadataRoute.Sitemap = novels.filter(n => n.slug).map(n => ({
      url:             `${BASE_URL}/novel/${n.slug}`,
      lastModified:    n.updated_at ? new Date(n.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))

    return [...staticPages, ...novelEntries]
  } catch {
    return staticPages
  }
}
