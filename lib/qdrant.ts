// Qdrant client — vector store for chunk retrieval, replacing Supabase pgvector.
// Runs on the same VPS (localhost), so all chunk reads stay off Supabase (which
// only handles auth/profiles now). Single `chunks` collection, filtered by slug.

const Q    = process.env.QDRANT_URL || 'http://127.0.0.1:6333'
const COLL = 'chunks'

export interface ChunkRow { text: string; chapter_number: number; chapter_title: string; similarity: number }

async function qreq(path: string, body: unknown): Promise<any> {
  const r = await fetch(`${Q}/collections/${COLL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`qdrant ${path} ${r.status}`)
  return r.json()
}

const bySlug = (slug: string) => ({ key: 'slug', match: { value: slug } })

// Vector similarity search within one novel.
export async function matchChunks(embedding: number[], slug: string, count = 6, threshold = 0.2): Promise<ChunkRow[]> {
  const j = await qreq('/points/search', {
    vector: embedding,
    filter: { must: [bySlug(slug)] },
    limit: count,
    with_payload: true,
    score_threshold: threshold,
    params: { quantization: { rescore: true } },   // rescore int8 with full vectors for accuracy
  })
  return (j.result ?? []).map((p: any) => ({
    text: p.payload.text, chapter_number: p.payload.chapter_number,
    chapter_title: p.payload.chapter_title, similarity: p.score,
  }))
}

// Embedded == has at least one point in Qdrant.
export async function isNovelEmbedded(slug: string): Promise<boolean> {
  try {
    const j = await qreq('/points/count', { exact: false, filter: { must: [bySlug(slug)] } })
    return (j.result?.count ?? 0) > 0
  } catch { return false }
}

export async function countChunks(slug: string): Promise<number> {
  try {
    const j = await qreq('/points/count', { exact: true, filter: { must: [bySlug(slug)] } })
    return j.result?.count ?? 0
  } catch { return 0 }
}

// One row per chapter (chunk_index=0), in reading order — for the arc-locator title spine.
export async function scrollTitles(slug: string): Promise<{ chapter_number: number; chapter_title: string }[]> {
  const out: { chapter_number: number; chapter_title: string }[] = []
  let cursor = -1
  for (let i = 0; i < 12; i++) {
    const j = await qreq('/points/scroll', {
      filter: { must: [bySlug(slug), { key: 'chunk_index', match: { value: 0 } }, { key: 'chapter_number', range: { gt: cursor } }] },
      limit: 1000, with_payload: ['chapter_number', 'chapter_title'], order_by: { key: 'chapter_number', direction: 'asc' },
    })
    const pts = j.result?.points ?? []
    if (!pts.length) break
    for (const p of pts) out.push({ chapter_number: p.payload.chapter_number, chapter_title: p.payload.chapter_title })
    cursor = pts[pts.length - 1].payload.chapter_number
    if (pts.length < 1000) break
  }
  return out
}

// All chunks in a chapter range, reading order — for arc retrieval.
export async function scrollRange(slug: string, start: number, end: number, limit = 200): Promise<ChunkRow[]> {
  const j = await qreq('/points/scroll', {
    filter: { must: [bySlug(slug), { key: 'chapter_number', range: { gte: start, lte: end } }] },
    limit, with_payload: true, order_by: { key: 'chapter_number', direction: 'asc' },
  })
  const rows = (j.result?.points ?? []).map((p: any) => ({
    text: p.payload.text, chapter_number: p.payload.chapter_number,
    chapter_title: p.payload.chapter_title, chunk_index: p.payload.chunk_index, similarity: 1,
  }))
  rows.sort((a: any, b: any) => a.chapter_number - b.chapter_number || a.chunk_index - b.chunk_index)
  return rows.map(({ chunk_index, ...r }: any) => r)
}

// Chronological spine from the start of the novel — for broad/summary queries.
export async function scrollChrono(slug: string, limit = 60): Promise<ChunkRow[]> {
  const j = await qreq('/points/scroll', {
    filter: { must: [bySlug(slug)] },
    limit, with_payload: true, order_by: { key: 'chapter_number', direction: 'asc' },
  })
  return (j.result?.points ?? []).map((p: any) => ({
    text: p.payload.text, chapter_number: p.payload.chapter_number,
    chapter_title: p.payload.chapter_title, similarity: 0,
  }))
}
