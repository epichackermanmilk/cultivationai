import Link       from 'next/link'
import TokenWidget  from '@/components/TokenWidget'
import Footer       from '@/components/Footer'
import FeedbackWidget from '@/components/FeedbackWidget'
import AdSlot        from '@/components/AdSlot'

export const metadata = {
  title: 'Games — NovelCodex',
  description: 'AI-powered cultivation games. Recruit disciples, survive inside novels, and test your xianxia knowledge.',
}

interface Game {
  id:          string
  title:       string
  tagline:     string
  description: string
  cost:        string
  costNote:    string
  status:      'available' | 'coming_soon'
  href:        string
  icon:        string
  accent:      string   // tailwind color key for glow/border
  gradient:    string   // inline style gradient
}

const GAMES: Game[] = [
  {
    id:          'sect-recruitment',
    title:       'Sect Recruitment',
    tagline:     'Every elder makes mistakes. Most survive them.',
    description: 'Eight applicants. One seat per decision. Hidden geniuses, demon spies, future emperors, and very unfortunate young masters walk through your door. You have no idea which is which.',
    cost:        '50 tokens',
    costNote:    'One session · ~15 min',
    status:      'available',
    href:        '/games/sect-recruitment',
    icon:        '📜',
    accent:      'amber',
    gradient:    'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(180,83,9,0.08) 100%)',
  },
  {
    id:          'regressor-challenge',
    title:       'Regressor Challenge',
    tagline:     'You will die. The question is how much you learn.',
    description: 'You know disaster is coming in 30 turns. You do not know how to stop it — yet. Every death is knowledge. The AI remembers your previous runs. Eventually, you will be ready.',
    cost:        '75 tokens',
    costNote:    'Multi-run campaign',
    status:      'coming_soon',
    href:        '#',
    icon:        '⚔️',
    accent:      'violet',
    gradient:    'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(109,40,217,0.08) 100%)',
  },
  {
    id:          'survival-in-the-novel',
    title:       'Survival in the Novel',
    tagline:     'You woke up inside the story. Now survive it.',
    description: 'Pick a novel from the library. Wake up inside its world, armed only with your knowledge of the plot. The more you have read, the longer you live. Reach the end of the arc — or die trying.',
    cost:        '150 tokens',
    costNote:    'Flagship · 60 turns',
    status:      'coming_soon',
    href:        '#',
    icon:        '📖',
    accent:      'emerald',
    gradient:    'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)',
  },
  {
    id:          'defective-system',
    title:       'The Defective System',
    tagline:     'Quest received: slap the Sect Master.',
    description: 'The System has assigned you five impossible, embarrassing, and deeply inadvisable quests. Each one is worse than the last. Survive as long as you can. Each failure is funnier than the last.',
    cost:        '30 tokens',
    costNote:    'One run · ~10 min',
    status:      'available',
    href:        '/games/defective-system',
    icon:        '⚠️',
    accent:      'rose',
    gradient:    'linear-gradient(135deg, rgba(244,63,94,0.15) 0%, rgba(190,18,60,0.08) 100%)',
  },
  {
    id:          'character-battle',
    title:       'Character Battle Debate',
    tagline:     'Pick your fighter. The lore decides.',
    description: 'Pick any two characters from our library — same novel or cross-novel. Set a chapter range for each. A battle is simulated using real lore from the text. Powerscaling, settled.',
    cost:        '25 tokens',
    costNote:    'One match · ~5 min',
    status:      'available',
    href:        '/games/character-battle',
    icon:        '⚡',
    accent:      'orange',
    gradient:    'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(194,65,12,0.08) 100%)',
  },
]

const accentClasses: Record<string, { border: string; text: string; badge: string; glow: string }> = {
  amber:   { border: 'border-amber-500/30',   text: 'text-amber-400',   badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400',   glow: 'hover:border-amber-500/50 hover:shadow-amber-500/10' },
  violet:  { border: 'border-violet-500/30',  text: 'text-violet-400',  badge: 'bg-violet-500/15 border-violet-500/30 text-violet-400',  glow: 'hover:border-violet-500/50 hover:shadow-violet-500/10' },
  emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', glow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10' },
  rose:    { border: 'border-rose-500/30',    text: 'text-rose-400',    badge: 'bg-rose-500/15 border-rose-500/30 text-rose-400',    glow: 'hover:border-rose-500/50 hover:shadow-rose-500/10' },
  sky:     { border: 'border-sky-500/30',     text: 'text-sky-400',     badge: 'bg-sky-500/15 border-sky-500/30 text-sky-400',     glow: 'hover:border-sky-500/50 hover:shadow-sky-500/10' },
  orange:  { border: 'border-orange-500/30',  text: 'text-orange-400',  badge: 'bg-orange-500/15 border-orange-500/30 text-orange-400',  glow: 'hover:border-orange-500/50 hover:shadow-orange-500/10' },
}

export default function GamesPage() {
  const available = GAMES.filter(g => g.status === 'available')
  const soon      = GAMES.filter(g => g.status === 'coming_soon')

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/library" className="group shrink-0 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">NovelCodex</h1>
              <p className="hidden lg:block text-xs text-zinc-500">Every secret, every character, every world — ask anything.</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/chat"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              ✦ Multi-Novel Chat
            </Link>
            <Link href="/library"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              Library
            </Link>
            <Link href="/characters"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              🎭 Characters
            </Link>
            <Link href="/games"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
              🎮 Games
            </Link>
            <TokenWidget />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-10">

        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-500/70">✦ The Arena</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--nc-text)' }}>
            Enter the Game
          </h2>
          <p className="mt-3 max-w-lg mx-auto text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
            AI games built from xianxia lore. Recruit disciples, survive inside novels, solve impossible quests.
            Each game costs a flat token fee — no per-message billing, no cut-off mid-dungeon.
          </p>
        </div>

        {/* Available now */}
        {available.length > 0 && (
          <section className="mb-12">
            <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-amber-500/70">Available Now</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {available.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        )}

        {/* Ad slot */}
        {soon.length > 0 && <AdSlot variant="banner" className="mb-10 rounded-xl" />}

        {/* Coming soon */}
        <section>
          <h3 className="mb-5 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--nc-text2)' }}>
            Coming Soon
          </h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {soon.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>

        {/* Bottom note */}
        <div className="mt-14 rounded-2xl border border-[var(--nc-border)] p-6 text-center"
          style={{ background: 'var(--nc-bg2)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>More games in development</p>
          <p className="mt-1.5 max-w-sm mx-auto text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
            Each game is built around cultivation novel lore. Upcoming: Regressor Challenge, Murim Investigation,
            Hidden Traitor, Heavenly Auction, and more. Community scenarios coming soon.
          </p>
        </div>

      </main>

      <Footer />
      <FeedbackWidget />
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const ac      = accentClasses[game.accent] ?? accentClasses.amber
  const isSoon  = game.status === 'coming_soon'

  const inner = (
    <div
      className={`group relative flex flex-col h-full overflow-hidden rounded-2xl border transition-all duration-300 shadow-lg ${ac.border} ${!isSoon ? ac.glow : ''} ${isSoon ? 'opacity-60' : ''}`}
      style={{ background: 'var(--nc-bg2)' }}
    >
      {/* Gradient header band */}
      <div
        className="relative flex items-center gap-3 px-5 pt-5 pb-4"
        style={{ background: game.gradient }}
      >
        <span className="text-3xl select-none">{game.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-base font-bold leading-tight ${ac.text}`}>{game.title}</p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--nc-text2)' }}>{game.tagline}</p>
        </div>
        {isSoon && (
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}>
            Soon
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5 pt-3">
        <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--nc-text2)' }}>
          {game.description}
        </p>

        {/* Cost + action */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${ac.badge}`}>
              {game.cost}
            </span>
            <p className="mt-1 text-[10px]" style={{ color: 'var(--nc-text2)' }}>{game.costNote}</p>
          </div>

          {isSoon ? (
            <span className="rounded-lg border border-[var(--nc-border)] px-4 py-2 text-xs font-semibold"
              style={{ color: 'var(--nc-text2)' }}>
              Coming Soon
            </span>
          ) : (
            <span className={`rounded-lg px-4 py-2 text-xs font-bold transition group-hover:opacity-90 ${ac.text}`}
              style={{ background: game.gradient, border: `1px solid`, borderColor: 'transparent' }}>
              Play Now →
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (isSoon) return <div className="cursor-default">{inner}</div>
  return <Link href={game.href} className="block h-full">{inner}</Link>
}
