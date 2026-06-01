import Link        from 'next/link'
import { listNovels } from '@/lib/vps'
import { FEATURED_CHARACTERS } from '@/lib/featured-characters'
import SiteHeader  from '@/components/SiteHeader'
import FeedbackWidget from '@/components/FeedbackWidget'
import Footer        from '@/components/Footer'
import AdSlot        from '@/components/AdSlot'

// ── Readable novel names ──────────────────────────────────────────────────────
const NOVEL_NAMES: Record<string, string> = {
  'reverend-insanity':       'Reverend Insanity',
  'renegade-immortal':       'Renegade Immortal',
  'against-the-gods':        'Against the Gods',
  'a-will-eternal':          'A Will Eternal',
  'i-shall-seal-the-heavens':'I Shall Seal the Heavens',
  'warlock-of-the-magus-world': 'Warlock of the Magus World',
  'shadow-slave':            'Shadow Slave',
  'supreme-magus':           'Supreme Magus',
}

// ── Fallback cover images (from our scraped sources) ─────────────────────────
const FALLBACK_COVERS: Record<string, string> = {
  'reverend-insanity':        'https://images.novelbin.me/novel/reverend-insanity.jpg',
  'renegade-immortal':        'https://images.novelbin.me/novel/renegade-immortal.jpg',
  'against-the-gods':         'https://static.novelbuddy.com/covers/against-the-gods.png',
  'a-will-eternal':           'https://images.novelbin.me/novel/a-will-eternal.jpg',
  'i-shall-seal-the-heavens': 'https://images.novelbin.me/novel/i-shall-seal-the-heavens.jpg',
  'warlock-of-the-magus-world':'https://images.novelbin.me/novel/warlock-of-the-magus-world.jpg',
  'shadow-slave':             'https://images.novelbin.me/novel/shadow-slave.jpg',
  'supreme-magus':            'https://images.novelbin.me/novel/supreme-magus-novel.jpg',
}

export default async function CharactersPage() {
  // ── Fetch novel covers from VPS ──────────────────────────────────────────────
  let coverMap: Record<string, string> = {}
  try {
    const novels = await listNovels()
    for (const n of novels) {
      if (n.cover_url) coverMap[n.slug] = n.cover_url
    }
  } catch {
    // VPS unreachable — use fallback covers
  }

  // ── Build featured character entries ─────────────────────────────────────────
  const entries = Object.entries(FEATURED_CHARACTERS).flatMap(([slug, chars]) =>
    chars.map(char => ({
      slug,
      novelName: NOVEL_NAMES[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      coverUrl:  coverMap[slug] ?? FALLBACK_COVERS[slug] ?? '',
      char,
    }))
  )

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-14">

        {/* Hero */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-500/70">✦ Featured</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--nc-text)' }}>
            Step into the story
          </h2>
          <p className="mt-3 max-w-md mx-auto text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
            Chat with iconic characters from the novels you love. Each one speaks from the end of their
            journey — with every memory, scar, and secret intact.
          </p>
        </div>

        {/* Character grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map(({ slug, novelName, coverUrl, char }) => (
            <CharacterCard
              key={`${slug}-${char.name}`}
              slug={slug}
              novelName={novelName}
              coverUrl={coverUrl}
              char={char}
            />
          ))}
        </div>

        {/* Ad slot — below the roster, well clear of the cards */}
        <AdSlot variant="banner" className="mt-10 rounded-xl" />

        {/* Community note */}
        <div className="mt-10 rounded-2xl border border-[var(--nc-border)] p-6 text-center"
          style={{ background: 'var(--nc-bg2)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>More characters coming</p>
          <p className="mt-1.5 max-w-sm mx-auto text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
            Community characters are auto-generated for every novel. Each story in the library
            gets its own character roster — open any novel and they appear in Character Chat mode.
          </p>
          <Link href="/library"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10
              px-4 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20">
            Browse 500+ Novels →
          </Link>
        </div>

      </main>

      <Footer />
      <FeedbackWidget />
    </div>
  )
}

// ── Character card ─────────────────────────────────────────────────────────────
function CharacterCard({
  slug, novelName, coverUrl, char,
}: {
  slug:      string
  novelName: string
  coverUrl:  string
  char: {
    name: string
    speech_style: string
    core_traits: string[]
    motivation: string
    featured: true
  }
}) {
  // Show at most 2 traits as chips (keep cards compact)
  const chips = char.core_traits.slice(0, 2).map(t => {
    // Strip the " — specific detail" suffix if present
    const clean = t.split(' — ')[0]
    return clean.length > 32 ? clean.slice(0, 30) + '…' : clean
  })

  const chatUrl = `/novel/${slug}?char=${encodeURIComponent(char.name)}&mode=character`

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5"
      style={{ background: 'var(--nc-bg2)' }}>

      {/* Cover strip */}
      <div className="relative h-40 overflow-hidden bg-zinc-900">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={novelName}
            className="h-full w-full object-cover object-top opacity-70 transition duration-500 group-hover:opacity-90 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)' }} />
        )}
        {/* Gradient fade bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: 'linear-gradient(to top, var(--nc-bg2) 0%, transparent 100%)' }} />

        {/* Novel name chip */}
        <div className="absolute top-3 left-3">
          <span className="inline-block rounded-full border border-amber-500/30 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-amber-400 backdrop-blur-sm">
            {novelName}
          </span>
        </div>

        {/* ✦ Featured badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-sm">
            ✦ Featured
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 pt-2">
        {/* Character name */}
        <h3 className="text-base font-bold text-amber-300">{char.name}</h3>

        {/* Speech style as tagline — 2 lines */}
        <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--nc-text2)' }}>
          {char.speech_style}
        </p>

        {/* Trait chips */}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map(t => (
              <span key={t}
                className="rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[10px]"
                style={{ color: 'var(--nc-text2)' }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-4">
          <Link
            href={chatUrl}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20 hover:border-amber-500/60 hover:text-amber-300"
          >
            Chat with {char.name} →
          </Link>
        </div>
      </div>
    </div>
  )
}
