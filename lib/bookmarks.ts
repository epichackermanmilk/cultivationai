// ── localStorage-backed bookmarks & recent visits ────────────────────────────

export interface NovelMeta {
  slug:           string
  title:          string
  author:         string
  cover_url:      string
  genres:         string[]
  total_chapters: number
}

export interface RecentEntry extends NovelMeta {
  visitedAt: number
}

const BM_KEY     = 'nc_bookmarks'      // set of slugs
const BM_DETAIL  = 'nc_bm_details'     // full novel objects
const RECENT_KEY = 'nc_recent'
const MAX_RECENT = 16

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export function getBookmarkedSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem(BM_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

export function getBookmarks(): NovelMeta[] {
  try {
    const raw = localStorage.getItem(BM_DETAIL)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/** Toggles bookmark; returns true if now bookmarked */
export function toggleBookmark(novel: NovelMeta): boolean {
  const slugs = getBookmarkedSlugs()
  if (slugs.has(novel.slug)) {
    slugs.delete(novel.slug)
    const details = getBookmarks().filter(b => b.slug !== novel.slug)
    localStorage.setItem(BM_DETAIL, JSON.stringify(details))
  } else {
    slugs.add(novel.slug)
    const details = getBookmarks().filter(b => b.slug !== novel.slug)
    details.unshift(novel)
    localStorage.setItem(BM_DETAIL, JSON.stringify(details))
  }
  localStorage.setItem(BM_KEY, JSON.stringify([...slugs]))
  return slugs.has(novel.slug)
}

// ── Recent visits ─────────────────────────────────────────────────────────────

export function recordVisit(novel: NovelMeta): void {
  try {
    const recent = getRecent().filter(r => r.slug !== novel.slug)
    recent.unshift({ ...novel, visitedAt: Date.now() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch { /* localStorage unavailable */ }
}

export function getRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
