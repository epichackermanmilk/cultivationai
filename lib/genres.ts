// Genre normalization — merges casing/spelling variants, fixes typos, and drops
// junk genres. Applied to all novel data so filters and cards stay clean.

// case-insensitive key → canonical display name
const CANON: Record<string, string> = {
  'slice of life': 'Slice of Life',
  'slice of lif':  'Slice of Life',   // typo
  'martial arts':  'Martial Arts',
  'school life':   'School Life',
  'gender bender': 'Gender Bender',
  'shoujo ai':     'Shoujo Ai',
  'shounen ai':    'Shounen Ai',
  'eastern':       'Eastern',
  'easterni':      'Eastern',          // typo
  'romance':       'Romance',
  'romanc':        'Romance',          // typo
  'sci-fi':        'Sci-fi',
  'litrpg':        'LitRPG',
}

// dropped entirely (junk / unclear / bloat)
const BLOCK = new Set(['actionadventure', 'other', 'fan-fiction'])

export function cleanGenres(genres: string[] | undefined | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of genres ?? []) {
    const trimmed = (raw ?? '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (BLOCK.has(key)) continue
    const canon = CANON[key] ?? trimmed
    const ck = canon.toLowerCase()
    if (!seen.has(ck)) { seen.add(ck); out.push(canon) }
  }
  return out
}
