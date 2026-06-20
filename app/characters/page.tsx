// /characters — curated character roster, redesigned to the /test* standard.
// This is where chat lives now (curated novels only — keeps embed costs down).
// Each card opens the themed chat at /testnovel/[slug]?char=…&mode=character.

import Link from 'next/link'
import { listNovels } from '@/lib/vps'
import { FEATURED_CHARACTERS } from '@/lib/featured-characters'
import { coverSrc } from '@/lib/cover'
import TestHeader from '@/components/TestHeader'
import { TestStyles } from '@/components/TestUI'
import TestFooter from '@/components/TestFooter'

const NOVEL_NAMES: Record<string, string> = {
  'reverend-insanity': 'Reverend Insanity', 'renegade-immortal': 'Renegade Immortal',
  'against-the-gods': 'Against the Gods', 'a-will-eternal': 'A Will Eternal',
  'i-shall-seal-the-heavens': 'I Shall Seal the Heavens', 'warlock-of-the-magus-world': 'Warlock of the Magus World',
  'shadow-slave': 'Shadow Slave', 'supreme-magus': 'Supreme Magus',
}
const FALLBACK_COVERS: Record<string, string> = {
  'reverend-insanity': 'https://images.novelbin.me/novel/reverend-insanity.jpg',
  'renegade-immortal': 'https://images.novelbin.me/novel/renegade-immortal.jpg',
  'against-the-gods': 'https://static.novelbuddy.com/covers/against-the-gods.png',
  'a-will-eternal': 'https://images.novelbin.me/novel/a-will-eternal.jpg',
  'i-shall-seal-the-heavens': 'https://images.novelbin.me/novel/i-shall-seal-the-heavens.jpg',
  'warlock-of-the-magus-world': 'https://images.novelbin.me/novel/warlock-of-the-magus-world.jpg',
  'shadow-slave': 'https://images.novelbin.me/novel/shadow-slave.jpg',
  'supreme-magus': 'https://images.novelbin.me/novel/supreme-magus-novel.jpg',
}

export default async function TestCharactersPage() {
  const coverMap: Record<string, string> = {}
  try {
    const novels = await listNovels()
    for (const n of novels) if (n.cover_url) coverMap[n.slug] = n.cover_url
  } catch { /* VPS unreachable — fallbacks */ }

  const entries = Object.entries(FEATURED_CHARACTERS).flatMap(([slug, chars]) =>
    chars.map(char => ({
      slug,
      novelName: NOVEL_NAMES[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      coverUrl: coverMap[slug] ?? FALLBACK_COVERS[slug] ?? '',
      char,
    }))
  )

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 55% at 50% -10%, rgba(var(--v),0.24) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-10 sm:px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--v))' }}>✦ Character Chat</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Talk to the legends</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/55">
            Chat with hand-crafted characters from our curated novels. Each speaks from the end of their journey —
            every memory, scar, and secret intact, grounded in the actual text.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map(({ slug, novelName, coverUrl, char }) => {
            const chips = char.core_traits.slice(0, 2).map(t => {
              const c = t.split(' — ')[0]
              return c.length > 32 ? c.slice(0, 30) + '…' : c
            })
            const chatUrl = `/novel/${slug}/chat?char=${encodeURIComponent(char.name)}&mode=character`
            return (
              <Link key={`${slug}-${char.name}`} href={chatUrl} className="group tnl-panel flex flex-col overflow-hidden border-white/12 transition duration-300 hover:-translate-y-1 hover:border-[rgba(var(--v),0.55)]">
                <div className="relative h-40 overflow-hidden border-b border-white/10">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverSrc(coverUrl)} alt={novelName} className="h-full w-full object-cover object-top opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
                  ) : <div className="h-full w-full" style={{ background: 'linear-gradient(135deg,#1a1726,#221d33)' }} />}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(to top, rgba(18,15,30,0.95), transparent)' }} />
                  <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">{novelName}</span>
                  <span className="absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur" style={{ borderColor: 'rgba(var(--v),0.7)', background: 'rgba(var(--v),0.35)' }}>✦ Featured</span>
                </div>
                <div className="flex flex-1 flex-col p-4 pt-3">
                  <h3 className="text-base font-bold text-white">{char.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/60">{char.speech_style}</p>
                  {chips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chips.map(t => <span key={t} className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/65">{t}</span>)}
                    </div>
                  )}
                  <div className="mt-auto pt-4">
                    <span className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white transition group-hover:border-[rgba(var(--v),0.8)] group-hover:bg-[rgba(var(--v),0.25)]">
                      Chat with {char.name} →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-10 tnl-panel p-6 text-center">
          <p className="text-sm font-semibold">Want a character added?</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-white/55">
            Every character is hand-crafted for authenticity — voice, personality, and memories verified against the novel.
            Use the feedback button and select &quot;Request a Character&quot;.
          </p>
        </div>
      </main>

      <TestFooter />
      <TestStyles />
    </div>
  )
}
