// Forgiving search normalization.
// Lowercases, strips accents, removes apostrophes, and turns any run of
// punctuation into a single space — so "Heaven's", "heavens", and "heaven’s"
// all compare equal. Use on BOTH the query and the text being matched.
export function normalizeSearch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip diacritics (é → e)
    .replace(/['’`´ʼ]/g, '')   // drop apostrophes entirely
    .replace(/[^a-z0-9]+/g, ' ')                        // other punctuation → space
    .replace(/\s+/g, ' ')
    .trim()
}

// Does `haystack` contain `query` after normalization?
export function matchesSearch(haystack: string, query: string): boolean {
  const q = normalizeSearch(query)
  if (!q) return true
  return normalizeSearch(haystack).includes(q)
}
