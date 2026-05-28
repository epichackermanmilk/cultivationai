// ── localStorage-backed bookmarks & recent visits ────────────────────────────
// When the user is authenticated, bookmarks are also synced to Supabase via
// /api/bookmarks so they persist across devices.  For guests, localStorage only.

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

const BM_KEY     = 'nc_bookmarks'      // set of slugs (localStorage)
const BM_DETAIL  = 'nc_bm_details'     // full novel objects (localStorage)
const RECENT_KEY = 'nc_recent'
const MAX_RECENT = 16

// ── localStorage bookmarks (guest / offline fallback) ─────────────────────────

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

/** Toggles bookmark in localStorage only; returns true if now bookmarked */
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

// ── Server-synced bookmarks (authenticated users) ─────────────────────────────
// Module-level slug cache so we only hit the API once per browser session,
// even if many BookmarkButton components mount simultaneously.

let _serverSlugs: Set<string> | null = null
let _syncPromise: Promise<void> | null = null

/**
 * Fetches all bookmark slugs from the server (once per session).
 * Subsequent calls return the cached in-memory Set immediately.
 */
export async function ensureServerSync(): Promise<Set<string>> {
  if (_serverSlugs !== null) return _serverSlugs
  if (_syncPromise) {
    await _syncPromise
    return _serverSlugs ?? new Set()
  }
  _syncPromise = (async () => {
    try {
      const res = await fetch('/api/bookmarks')
      if (!res.ok) { _serverSlugs = new Set(); return }
      const data = await res.json()
      const slugs: string[] = (data.bookmarks ?? []).map((b: { slug: string }) => b.slug)
      _serverSlugs = new Set(slugs)
      // Mirror into localStorage so BookmarkButton reads are instant on remount
      localStorage.setItem(BM_KEY, JSON.stringify(slugs))
      localStorage.setItem(BM_DETAIL, JSON.stringify(data.bookmarks ?? []))
    } catch {
      _serverSlugs = new Set()
    }
  })()
  await _syncPromise
  return _serverSlugs ?? new Set()
}

/** Call after sign-out so the next sign-in re-fetches a fresh set. */
export function invalidateBookmarkCache() {
  _serverSlugs = null
  _syncPromise = null
}

/**
 * Adds or removes a bookmark on the server and updates the in-memory cache.
 * Returns true if the novel is now bookmarked.
 */
export async function serverToggleBookmark(novel: NovelMeta): Promise<boolean> {
  const slugs = await ensureServerSync()
  if (slugs.has(novel.slug)) {
    await fetch('/api/bookmarks', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ slug: novel.slug }),
    })
    slugs.delete(novel.slug)
    // Also remove from localStorage mirror
    const details = getBookmarks().filter(b => b.slug !== novel.slug)
    const remaining = [...slugs]
    localStorage.setItem(BM_KEY,    JSON.stringify(remaining))
    localStorage.setItem(BM_DETAIL, JSON.stringify(details))
    return false
  } else {
    await fetch('/api/bookmarks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(novel),
    })
    slugs.add(novel.slug)
    // Also add to localStorage mirror
    const details = getBookmarks().filter(b => b.slug !== novel.slug)
    details.unshift(novel)
    localStorage.setItem(BM_KEY,    JSON.stringify([...slugs]))
    localStorage.setItem(BM_DETAIL, JSON.stringify(details))
    return true
  }
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

export function removeRecent(slug: string): void {
  try {
    const updated = getRecent().filter(r => r.slug !== slug)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch { /* localStorage unavailable */ }
}
