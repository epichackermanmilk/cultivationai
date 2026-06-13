// Structured per-novel knowledge for precise RAG grounding.
// Two bundled sources, both extracted from the indexed chapters:
//   knowledge.json — character roster (name, aliases, affiliation, role, cultivation)
//   lore.json      — power/cultivation system + a glossary (terms, aliases, meanings)
//
// The retrieval layer (hybrid + reranker + spoiler) finds the passages; this layer
// gives the model AUTHORITATIVE, query-relevant facts to resolve references and
// terminology precisely — without asserting anything the passages don't support.

import RAW   from './knowledge.json'
import LORE  from './lore.json'
import OVR   from './lore-overrides.json'

export interface KBCharacter {
  name: string; aliases: string[]; affiliation: string; role: string; cultivation: string; one_line: string
}
export interface KBNovel { slug: string; character_count: number; characters: KBCharacter[] }

export interface LadderTier { tier: string; note?: string }
export interface PowerSystem { name?: string; summary?: string; ladder?: LadderTier[]; mechanics?: string[]; key_terms?: string[] }
export interface GlossaryEntry { term: string; aliases?: string[]; type?: string; meaning?: string }
export interface NovelLore { slug: string; power_system?: PowerSystem; glossary?: GlossaryEntry[] }

const CHARS = RAW  as unknown as Record<string, KBNovel>
const LOREDATA = LORE as unknown as Record<string, NovelLore>
const OVERRIDES = OVR as unknown as Record<string, { power_system?: PowerSystem }>

export function hasKnowledge(slug: string): boolean {
  return !!CHARS[slug]?.characters?.length
}
export function getNovelKnowledge(slug: string): KBNovel | null { return CHARS[slug] ?? null }

// Merge curated overrides (hand-authored, verified power-system) over the
// auto-extracted lore. Glossary stays from extraction; power_system prefers the override.
export function getNovelLore(slug: string): NovelLore | null {
  const base = LOREDATA[slug]
  const ovr  = OVERRIDES[slug]
  if (!base && !ovr) return null
  return {
    slug,
    power_system: ovr?.power_system ?? base?.power_system,
    glossary:     base?.glossary ?? [],
  }
}

export function findCharacter(slug: string, name: string): KBCharacter | null {
  const kb = CHARS[slug]; if (!kb) return null
  const q = name.trim().toLowerCase()
  return kb.characters.find(c => c.name.toLowerCase() === q || c.aliases.some(a => a.toLowerCase() === q)) ?? null
}

// Compact, always-injectable power-system summary (small + high value for these novels).
export function getPowerSummary(slug: string): string {
  const ps = getNovelLore(slug)?.power_system
  if (!ps || (!ps.ladder?.length && !ps.summary)) return ''
  const parts: string[] = []
  if (ps.summary) parts.push(ps.summary.trim())
  if (ps.ladder?.length) {
    const ladder = ps.ladder.slice(0, 14).map(t => t.tier + (t.note ? ` (${t.note})` : '')).join(' → ')
    parts.push(`Progression: ${ladder}`)
  }
  return parts.join('\n')
}

// ── Query-aware fact selection ─────────────────────────────────────────────────
// Match glossary terms / character names+aliases that actually appear in the
// question, so we inject only what's relevant (precise + token-efficient).
function mentioned(question: string, term: string): boolean {
  const t = term.trim().toLowerCase()
  if (t.length < 3) return false
  return question.includes(t)
}

/**
 * Build a VERIFIED-FACTS block for the system prompt: always the power-system
 * summary, plus any glossary entries and characters the question references.
 * Returns '' when there's nothing relevant.
 */
export function getRelevantFacts(slug: string, question: string, opts?: { maxGlossary?: number; maxChars?: number }): string {
  const q = ` ${question.toLowerCase()} `
  const blocks: string[] = []

  const power = getPowerSummary(slug)
  if (power) blocks.push(`Power/cultivation system:\n${power}`)

  const gloss = LOREDATA[slug]?.glossary ?? []
  const maxG = opts?.maxGlossary ?? 8
  const hitG = gloss
    .filter(g => mentioned(q, g.term) || (g.aliases ?? []).some(a => mentioned(q, a)))
    .slice(0, maxG)
  if (hitG.length) {
    blocks.push('Relevant terms:\n' + hitG.map(g => {
      const al = g.aliases?.length ? ` (aka ${g.aliases.slice(0, 4).join(', ')})` : ''
      return `- ${g.term}${al}: ${g.meaning ?? ''}`.trim()
    }).join('\n'))
  }

  const chars = CHARS[slug]?.characters ?? []
  const maxC = opts?.maxChars ?? 6
  const hitC = chars
    .filter(c => mentioned(q, c.name) || (c.aliases ?? []).some(a => mentioned(q, a)))
    .slice(0, maxC)
  if (hitC.length) {
    blocks.push('Relevant characters:\n' + hitC.map(c => {
      const al  = c.aliases?.length ? ` (aka ${c.aliases.slice(0, 4).join(', ')})` : ''
      const aff = c.affiliation ? ` — ${c.affiliation}` : ''
      const cul = c.cultivation ? `; ${c.cultivation}` : ''
      return `- ${c.name}${al}${aff}${cul}`
    }).join('\n'))
  }

  return blocks.join('\n\n')
}

/** Fallback flat cast list (used if query-aware selection finds nothing). */
export function getCastContext(slug: string, max = 18): string {
  const kb = CHARS[slug]
  if (!kb?.characters?.length) return ''
  return kb.characters.slice(0, max).map(c => {
    const al  = c.aliases?.length ? ` (aka ${c.aliases.slice(0, 4).join(', ')})` : ''
    const aff = c.affiliation ? ` — ${c.affiliation}` : ''
    return `- ${c.name}${al}${aff}`
  }).join('\n')
}
