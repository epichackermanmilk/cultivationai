import { cleanGenres } from '@/lib/genres'

const BASE = process.env.VPS_API_URL!
const KEY  = process.env.VPS_API_KEY!

const headers = { 'X-Api-Key': KEY, 'Content-Type': 'application/json' }

export interface NovelMeta {
  slug:           string
  title:          string
  author:         string
  total_chapters: number
  genres:         string[]
  cover_url:      string
  description:    string
}

export async function listNovels(): Promise<NovelMeta[]> {
  const res = await fetch(`${BASE}/novels`, { headers, next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`VPS /novels failed: ${res.status}`)
  const data = await res.json()
  const novels = data.novels as NovelMeta[]
  return novels.map(n => ({ ...n, genres: cleanGenres(n.genres) }))
}

export async function triggerEmbed(slug: string) {
  const res = await fetch(`${BASE}/embed/${slug}`, { method: 'POST', headers })
  return res.json()
}

export async function getEmbedStatus(slug: string) {
  const res = await fetch(`${BASE}/status/${slug}`, { headers })
  return res.json()
}

export async function getNovelFacts(slug: string) {
  const res = await fetch(`${BASE}/novels/${slug}/facts`, { headers })
  if (!res.ok) return null
  return res.json()
}

// Direct per-novel metadata read — used as a fallback when a freshly-scraped
// novel hasn't propagated into the cached /novels index yet.
export async function getNovelMeta(slug: string): Promise<NovelMeta | null> {
  try {
    const res = await fetch(`${BASE}/novels/${slug}/meta`, { headers, next: { revalidate: 60 } })
    if (!res.ok) return null
    const n = await res.json() as NovelMeta
    return { ...n, genres: cleanGenres(n.genres) }
  } catch {
    return null
  }
}
