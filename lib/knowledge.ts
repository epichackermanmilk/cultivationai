// Structured per-novel knowledge (characters, aliases, power tiers), extracted
// from the indexed chapters by scripts/extract_knowledge.py and bundled here as
// knowledge.json. Used to (a) ground/disambiguate character chat, (b) inject an
// alias roster into book chat to cut name-resolution hallucinations, and (c)
// power richer character discovery surfaces.

import RAW from './knowledge.json'

export interface KBCharacter {
  name:        string
  aliases:     string[]
  affiliation: string
  role:        string   // protagonist | antagonist | major | supporting
  cultivation: string   // power/rank/realm if known, else ''
  one_line:    string
}
export interface KBNovel {
  slug:           string
  character_count: number
  characters:     KBCharacter[]
}

const DATA = RAW as unknown as Record<string, KBNovel>

export function hasKnowledge(slug: string): boolean {
  return !!DATA[slug]?.characters?.length
}

export function getNovelKnowledge(slug: string): KBNovel | null {
  return DATA[slug] ?? null
}

/** Look up a single character by name or alias (case-insensitive). */
export function findCharacter(slug: string, name: string): KBCharacter | null {
  const kb = DATA[slug]
  if (!kb) return null
  const q = name.trim().toLowerCase()
  return kb.characters.find(c =>
    c.name.toLowerCase() === q || c.aliases.some(a => a.toLowerCase() === q),
  ) ?? null
}

/**
 * A compact "cast list" for the system prompt — canonical names + aliases +
 * affiliation. Helps the model resolve "the Demon Sovereign" → the right person
 * and answer relationship/identity questions without guessing.
 */
export function getCastContext(slug: string, max = 24): string {
  const kb = DATA[slug]
  if (!kb?.characters?.length) return ''
  const lines = kb.characters.slice(0, max).map(c => {
    const al  = c.aliases?.length ? ` (aka ${c.aliases.slice(0, 4).join(', ')})` : ''
    const aff = c.affiliation ? ` — ${c.affiliation}` : ''
    const cul = c.cultivation ? `; ${c.cultivation}` : ''
    return `- ${c.name}${al}${aff}${cul}`
  })
  return lines.join('\n')
}
