// On-site chapter reader (test). Server component: pulls chapter text from the
// scraped JSON via the VPS (no embeddings → cheap, works for any scraped novel).
// Ad slots flank the text — the planned monetization for free reading.

import { Fragment } from 'react'
import Link from 'next/link'
import { getChapter } from '@/lib/vps'
import { TestStyles } from '@/components/TestUI'

interface Props { params: Promise<{ slug: string; number: string }> }

// Strip scrape boilerplate (translator/editor credits, word-count tags, the novel
// title repeated, lone dashes) and lift the chapter title out of the first line.
function cleanChapter(text: string, novelTitle: string): { heading: string | null; body: string[] } {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
  let heading: string | null = null
  let start = 0
  if (lines.length && /^chapter\b/i.test(lines[0])) { heading = lines[0]; start = 1 }
  const body: string[] = []
  for (let i = start; i < lines.length; i++) {
    const l = lines[i]
    if (/^(translator|editor|proofreader|proof-?reader|tl\s*check(er)?)\s*:?\s*$/i.test(l)) continue
    if (/translations?$/i.test(l) && l.split(/\s+/).length <= 4) continue
    if (/^\[\s*[\d,]+\s*words?\s*\]$/i.test(l)) continue
    if (/^[-–—•\s]+$/.test(l)) continue
    if (novelTitle && l.toLowerCase() === novelTitle.toLowerCase()) continue
    body.push(l)
  }
  return { heading, body }
}

function AdSlot({ label = 'Advertisement' }: { label?: string }) {
  // Placeholder for the ad unit — real AdSense wires in at migration. Demonstrates
  // where reading-page ads live (the primary monetization for free chapters).
  return (
    <div className="my-8 flex h-24 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/25">
      {label}
    </div>
  )
}

export default async function ReaderPage({ params }: Props) {
  const { slug, number } = await params
  const n = Math.max(1, parseInt(number, 10) || 1)
  const ch = await getChapter(slug, n)

  if (!ch) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-white" style={{ background: '#07060d' }}>
        <p className="text-lg text-white/70">Chapter not available.</p>
        <Link href={`/testnewlibrary/${slug}`} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'rgb(124,58,237)' }}>← Back to novel</Link>
      </div>
    )
  }

  const { heading, body } = cleanChapter(ch.text, ch.novel_title)
  const chapterHref = (k: number) => `/testnewlibrary/${slug}/read/${k}`

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237', background: '#07060d' }}>
      {/* Reader top bar */}
      <header className="sticky top-0 z-50 tnl-glass">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href={`/testnewlibrary/${slug}`} className="shrink-0 text-sm text-white/60 transition hover:text-white">← Novel</Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold">{ch.novel_title}</p>
            <p className="text-[11px] text-white/40">Chapter {ch.chapter_number}{ch.total ? ` / ${ch.total.toLocaleString()}` : ''}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {ch.prev ? <Link href={chapterHref(ch.prev)} className="tnl-navbtn">‹</Link> : <span className="tnl-navbtn opacity-30">‹</span>}
            {ch.next ? <Link href={chapterHref(ch.next)} className="tnl-navbtn">›</Link> : <span className="tnl-navbtn opacity-30">›</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <h1 className="text-2xl font-black tracking-tight">{heading || `Chapter ${ch.chapter_number}`}</h1>
        <p className="mt-1 text-xs text-white/40">{ch.novel_title}</p>

        <AdSlot label="Advertisement — top" />

        <article className="space-y-5 text-[17px] leading-[1.85] text-white/85">
          {body.map((p, i) => (
            <Fragment key={i}>
              <p>{p}</p>
              {/* Mid-chapter ad after roughly the first third */}
              {body.length > 12 && i === Math.floor(body.length / 3) && <AdSlot label="Advertisement — in-content" />}
            </Fragment>
          ))}
        </article>

        <AdSlot label="Advertisement — bottom" />

        {/* Chapter navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {ch.prev ? (
            <Link href={chapterHref(ch.prev)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-white/80 transition hover:text-white">‹ Previous</Link>
          ) : <div className="flex-1" />}
          <Link href={`/testnewlibrary/${slug}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:text-white">Chapters</Link>
          {ch.next ? (
            <Link href={chapterHref(ch.next)} className="flex-1 rounded-xl py-3 text-center text-sm font-bold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Next ›</Link>
          ) : <div className="flex-1 rounded-xl bg-white/5 py-3 text-center text-sm text-white/40">The End</div>}
        </div>
      </main>

      <TestStyles />
    </div>
  )
}
