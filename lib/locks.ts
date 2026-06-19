// Chapter-lock model: the latest LOCK_FRACTION of every novel is locked. Locked
// chapters are readable with an active subscription, or unlocked individually with
// tokens. Full EPUB downloads cost tokens (free for subscribers).

export const LOCK_FRACTION = 0.2   // latest 20% of chapters are locked
export const UNLOCK_COST = 2       // tokens per locked chapter
export const EPUB_COST = 50        // tokens for a full EPUB (free for subscribers)
export const EPUB_COOLDOWN_MS = 60 * 60 * 1000 // 1 download per hour

/** First `lockThreshold` chapters are free; chapter_number > threshold is locked. */
export function lockThreshold(total: number): number {
  if (!total || total <= 0) return 0
  return total - Math.ceil(total * LOCK_FRACTION)
}

export function isLocked(chapterNumber: number, total: number): boolean {
  return chapterNumber > lockThreshold(total)
}
