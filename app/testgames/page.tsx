'use client'

// /testgames — the Arena, redesigned to the /test* standard. A cinematic featured
// banner, a leveling / battle-pass teaser, and a grid of game cards. Same games and
// the same play routes as /games — only the presentation changes.

import Link from 'next/link'
import { useState } from 'react'
import TestHeader from '@/components/TestHeader'
import { TestStyles } from '@/components/TestUI'

interface Game {
  id: string; title: string; tagline: string; description: string
  cost: string; costNote: string; href: string; icon: string; tint: string; tag: string
}

const GAMES: Game[] = [
  { id: 'survival', title: 'Survival in the Novel', tagline: 'You woke up inside the story. Now survive it.',
    description: 'Pick a novel from the library. Wake up inside its world, armed only with your knowledge of the plot. The more you have read, the longer you live. Reach the end of the arc — or die trying.',
    cost: '50 tokens', costNote: 'Flagship · 5 attempts', href: '/games/survival', icon: '📖', tint: '16,185,129', tag: 'Flagship' },
  { id: 'regressor', title: 'Regressor Challenge', tagline: 'You will die. The question is how much you learn.',
    description: 'You know disaster is coming in 30 days. You do not know how to stop it — yet. Every death is knowledge. The AI remembers your past lives. You get 6 lives to crack it.',
    cost: '50 tokens', costNote: '6 lives · ~20 min', href: '/games/regressor', icon: '⚔️', tint: '139,92,246', tag: 'Strategy' },
  { id: 'sect-recruitment', title: 'Sect Recruitment', tagline: 'Every elder makes mistakes. Most survive them.',
    description: 'Eight applicants. One seat per decision. Hidden geniuses, demon spies, future emperors, and very unfortunate young masters walk through your door. You have no idea which is which.',
    cost: '25 tokens', costNote: 'One session · ~15 min', href: '/games/sect-recruitment', icon: '📜', tint: '245,158,11', tag: 'Social' },
  { id: 'character-battle', title: 'Character Battle Debate', tagline: 'Pick your fighter. The lore decides.',
    description: 'Pick any two characters from our library — same novel or cross-novel. Set a chapter range for each. A battle is simulated using real lore from the text. Powerscaling, settled.',
    cost: '20 tokens', costNote: 'One match · ~5 min', href: '/games/character-battle', icon: '⚡', tint: '249,115,22', tag: 'Versus' },
  { id: 'defective-system', title: 'The Defective System', tagline: 'Quest received: slap the Sect Master.',
    description: 'The System has assigned you five impossible, embarrassing, and deeply inadvisable quests. Each one is worse than the last. Survive as long as you can. Each failure is funnier than the last.',
    cost: '25 tokens', costNote: 'One run · ~10 min', href: '/games/defective-system', icon: '⚠️', tint: '244,63,94', tag: 'Comedy' },
  { id: 'trivia', title: 'Trivia Gauntlet', tagline: 'Do you really know your novels?',
    description: 'Pick up to 10 novels. We ask random questions pulled from across them — without telling you which is which. Typos and close answers still count. Get a letter grade and prove your mastery.',
    cost: 'From 10 tokens', costNote: '2 tokens/question · 5–20 Qs', href: '/games/trivia', icon: '🧠', tint: '14,165,233', tag: 'Quiz' },
]

function GameCard({ g }: { g: Game }) {
  return (
    <Link href={g.href} className="group block h-full">
      <div className="tnl-panel flex h-full flex-col overflow-hidden transition duration-300 group-hover:-translate-y-1">
        <div className="relative flex items-center gap-3 p-5 pb-4" style={{ background: `linear-gradient(135deg, rgba(${g.tint},0.20) 0%, rgba(${g.tint},0.04) 100%)` }}>
          <span className="text-3xl">{g.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight" style={{ color: `rgb(${g.tint})` }}>{g.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/55">{g.tagline}</p>
          </div>
          <span className="absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: `rgba(${g.tint},0.4)`, color: `rgb(${g.tint})` }}>{g.tag}</span>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5 pt-3">
          <p className="flex-1 text-xs leading-relaxed text-white/55">{g.description}</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: `rgba(${g.tint},0.4)`, color: `rgb(${g.tint})`, background: `rgba(${g.tint},0.1)` }}>{g.cost}</span>
              <p className="mt-1 text-[10px] text-white/40">{g.costNote}</p>
            </div>
            <span className="rounded-lg px-4 py-2 text-xs font-bold transition group-hover:brightness-110" style={{ background: `rgba(${g.tint},0.18)`, color: `rgb(${g.tint})` }}>Play Now →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function TestGamesPage() {
  const feat = GAMES[0]
  const [hover, setHover] = useState(false)

  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 55% at 50% -10%, rgba(var(--v),0.24) 0%, transparent 55%), radial-gradient(60% 50% at 85% 100%, rgba(var(--v),0.14) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--v))' }}>✦ The Arena</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Step inside the story</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/55">
            AI games built from real xianxia lore. Recruit disciples, survive inside novels, settle powerscaling debates.
            Flat token fee per game — no per-message billing, no cut-off mid-dungeon.
          </p>
        </div>

        {/* Featured banner */}
        <Link href={feat.href} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          className="group relative mb-6 block overflow-hidden rounded-3xl border border-white/10"
          style={{ boxShadow: '0 30px 70px rgba(0,0,0,0.45)' }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(80% 120% at 12% 0%, rgba(${feat.tint},0.40) 0%, transparent 60%), linear-gradient(120deg, #0c0a16 0%, #0a0912 100%)` }} />
          <div className="relative flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-5xl" style={{ background: `rgba(${feat.tint},0.15)`, boxShadow: `0 0 40px rgba(${feat.tint},0.4)`, transform: hover ? 'scale(1.06)' : 'none', transition: 'transform .3s' }}>{feat.icon}</div>
            <div className="min-w-0 flex-1">
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ background: `rgba(${feat.tint},0.2)`, color: `rgb(${feat.tint})` }}>Flagship game</span>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{feat.title}</h2>
              <p className="mt-1 text-sm text-white/65">{feat.tagline}</p>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/45">{feat.description}</p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition group-hover:brightness-110" style={{ background: `rgb(${feat.tint})`, boxShadow: `0 10px 30px rgba(${feat.tint},0.4)` }}>Play Now →</span>
              <p className="mt-2 text-center text-[11px] text-white/40">{feat.cost} · {feat.costNote}</p>
            </div>
          </div>
        </Link>

        {/* Leveling / battle-pass teaser */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: '⭐', title: 'Earn XP every run', body: 'Win or lose, every game levels up your account.' },
            { icon: '🏆', title: 'Season Battle Pass', body: 'Climb tiers for cosmetics, token rebates & titles.' },
            { icon: '🎴', title: 'Collect outcomes', body: 'Rare endings and feats get logged to your codex.' },
          ].map(c => (
            <div key={c.title} className="tnl-panel flex items-start gap-3 p-4">
              <span className="text-2xl">{c.icon}</span>
              <div>
                <p className="text-sm font-bold">{c.title} <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">Soon</span></p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/50">{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* All games */}
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white/45">All Games</h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map(g => <GameCard key={g.id} g={g} />)}
        </div>

        <div className="mt-12 tnl-panel p-6 text-center">
          <p className="text-sm font-semibold">✦ Community scenarios coming soon</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-white/55">
            Soon you&apos;ll be able to create, share, and play scenarios built by the community — set in your favorite novels.
          </p>
        </div>
      </main>

      <TestStyles />
    </div>
  )
}
