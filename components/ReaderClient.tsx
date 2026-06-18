'use client'

// Reader UI (client): font-size + theme (dark/sepia/light) controls persisted to
// localStorage, and "continue reading" progress so the novel page can offer Resume.
// Content arrives pre-cleaned from the server page. Ad slots flank the text.

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'

interface Props {
  slug: string; novelTitle: string; chapterNumber: number
  heading: string | null; body: string[]; total: number; prev: number | null; next: number | null
}

type ThemeKey = 'dark' | 'sepia' | 'light'
type FontKey = 'sm' | 'md' | 'lg' | 'xl'

const THEMES: Record<ThemeKey, { bg: string; text: string; sub: string; panel: string; border: string; header: string }> = {
  dark:  { bg: '#07060d', text: 'rgba(255,255,255,0.88)', sub: 'rgba(255,255,255,0.45)', panel: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', header: 'rgba(10,8,18,0.85)' },
  sepia: { bg: '#f3e9d2', text: '#4a3f2e', sub: '#8a7a5e', panel: 'rgba(0,0,0,0.05)', border: 'rgba(0,0,0,0.14)', header: 'rgba(243,233,210,0.9)' },
  light: { bg: '#ffffff', text: '#20242e', sub: '#6b7280', panel: 'rgba(0,0,0,0.04)', border: 'rgba(0,0,0,0.12)', header: 'rgba(255,255,255,0.9)' },
}
const FONT_PX: Record<FontKey, number> = { sm: 15, md: 17, lg: 20, xl: 23 }
const FONT_ORDER: FontKey[] = ['sm', 'md', 'lg', 'xl']

function AdSlot({ label, th }: { label: string; th: (typeof THEMES)[ThemeKey] }) {
  return (
    <div className="my-8 flex h-24 items-center justify-center rounded-xl border border-dashed text-[11px] uppercase tracking-widest"
      style={{ borderColor: th.border, color: th.sub, background: th.panel }}>{label}</div>
  )
}

export default function ReaderClient({ slug, novelTitle, chapterNumber, heading, body, total, prev, next }: Props) {
  const [theme, setTheme] = useState<ThemeKey>('dark')
  const [font, setFont] = useState<FontKey>('md')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ready, setReady] = useState(false)

  // Load saved prefs
  useEffect(() => {
    try {
      const t = localStorage.getItem('nc_reader_theme') as ThemeKey | null
      const f = localStorage.getItem('nc_reader_font') as FontKey | null
      if (t && THEMES[t]) setTheme(t)
      if (f && FONT_PX[f]) setFont(f)
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  // Persist + record reading progress for "Continue reading"
  useEffect(() => { try { localStorage.setItem('nc_reader_theme', theme) } catch {} }, [theme])
  useEffect(() => { try { localStorage.setItem('nc_reader_font', font) } catch {} }, [font])
  useEffect(() => {
    try {
      localStorage.setItem(`nc_read_${slug}`, JSON.stringify({ n: chapterNumber, title: novelTitle, at: Date.now() }))
    } catch { /* ignore */ }
    track('chapter_read', { slug, chapter: chapterNumber })
  }, [slug, chapterNumber, novelTitle])

  const th = THEMES[theme]
  const chapterHref = (k: number) => `/testnewlibrary/${slug}/read/${k}`

  return (
    <div className="relative min-h-screen transition-colors" style={{ background: th.bg, color: th.text, ['--v' as string]: '124,58,237', visibility: ready ? 'visible' : 'hidden' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-50 backdrop-blur" style={{ background: th.header, borderBottom: `1px solid ${th.border}` }}>
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href={`/testnewlibrary/${slug}`} className="shrink-0 text-sm transition hover:opacity-100" style={{ color: th.sub }}>← Novel</Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold">{novelTitle}</p>
            <p className="text-[11px]" style={{ color: th.sub }}>Chapter {chapterNumber}{total ? ` / ${total.toLocaleString()}` : ''}</p>
          </div>

          {/* Settings */}
          <div className="relative shrink-0">
            <button onClick={() => setSettingsOpen(o => !o)} className="flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition" style={{ borderColor: th.border }} title="Reading settings">
              A<span className="text-[10px]">a</span>
            </button>
            {settingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border p-3 shadow-2xl" style={{ background: theme === 'dark' ? '#100d1c' : th.bg, borderColor: th.border }}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Text size</p>
                  <div className="mb-3 flex gap-1.5">
                    {FONT_ORDER.map(f => (
                      <button key={f} onClick={() => setFont(f)} className="flex-1 rounded-lg border py-1.5 text-xs font-bold transition"
                        style={font === f ? { background: 'rgb(var(--v))', borderColor: 'transparent', color: '#fff' } : { borderColor: th.border, color: th.text }}>{f.toUpperCase()}</button>
                    ))}
                  </div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: th.sub }}>Theme</p>
                  <div className="flex gap-1.5">
                    {(['dark', 'sepia', 'light'] as ThemeKey[]).map(t => (
                      <button key={t} onClick={() => setTheme(t)} className="flex-1 rounded-lg border py-1.5 text-xs font-semibold capitalize transition"
                        style={theme === t ? { background: 'rgb(var(--v))', borderColor: 'transparent', color: '#fff' } : { borderColor: th.border, color: th.text }}>{t}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 gap-1.5">
            {prev ? <Link href={chapterHref(prev)} className="flex h-9 w-9 items-center justify-center rounded-lg border text-base transition" style={{ borderColor: th.border }}>‹</Link>
              : <span className="flex h-9 w-9 items-center justify-center rounded-lg border text-base opacity-30" style={{ borderColor: th.border }}>‹</span>}
            {next ? <Link href={chapterHref(next)} className="flex h-9 w-9 items-center justify-center rounded-lg border text-base transition" style={{ borderColor: th.border }}>›</Link>
              : <span className="flex h-9 w-9 items-center justify-center rounded-lg border text-base opacity-30" style={{ borderColor: th.border }}>›</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <h1 className="text-2xl font-black tracking-tight">{heading || `Chapter ${chapterNumber}`}</h1>
        <p className="mt-1 text-xs" style={{ color: th.sub }}>{novelTitle}</p>

        <AdSlot label="Advertisement — top" th={th} />

        <article className="space-y-5" style={{ fontSize: FONT_PX[font], lineHeight: 1.85 }}>
          {body.map((p, i) => (
            <Fragment key={i}>
              <p>{p}</p>
              {body.length > 12 && i === Math.floor(body.length / 3) && <AdSlot label="Advertisement — in-content" th={th} />}
            </Fragment>
          ))}
        </article>

        <AdSlot label="Advertisement — bottom" th={th} />

        <div className="mt-6 flex items-center justify-between gap-3">
          {prev ? <Link href={chapterHref(prev)} className="flex-1 rounded-xl border py-3 text-center text-sm font-semibold transition" style={{ borderColor: th.border }}>‹ Previous</Link> : <div className="flex-1" />}
          <Link href={`/testnewlibrary/${slug}`} className="rounded-xl border px-4 py-3 text-sm font-semibold transition" style={{ borderColor: th.border }}>Chapters</Link>
          {next ? <Link href={chapterHref(next)} className="flex-1 rounded-xl py-3 text-center text-sm font-bold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Next ›</Link>
            : <div className="flex-1 rounded-xl py-3 text-center text-sm" style={{ background: th.panel, color: th.sub }}>The End</div>}
        </div>
      </main>
    </div>
  )
}
