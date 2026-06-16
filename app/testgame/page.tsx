'use client'

// /testgame — the Arena, restyled to match the /test* redesign (dark glass, purple
// accent, living-purple ambient background). Same games + same play routes as
// /games; only the presentation changes.

import Link from 'next/link'
import TestHeader from '@/components/TestHeader'
import { TestStyles } from '@/components/TestUI'

interface Game {
  id: string; title: string; tagline: string; description: string
  cost: string; costNote: string; href: string; icon: string; tint: string
}

const GAMES: Game[] = [
  { id: 'sect-recruitment', title: 'Sect Recruitment', tagline: 'Every elder makes mistakes. Most survive them.',
    description: 'Eight applicants. One seat per decision. Hidden geniuses, demon spies, future emperors, and very unfortunate young masters walk through your door. You have no idea which is which.',
    cost: '25 tokens', costNote: 'One session · ~15 min', href: '/games/sect-recruitment', icon: '📜', tint: '245,158,11' },
  { id: 'regressor', title: 'Regressor Challenge', tagline: 'You will die. The question is how much you learn.',
    description: 'You know disaster is coming in 30 days. You do not know how to stop it — yet. Every death is knowledge. The AI remembers your past lives. You get 6 lives to crack it.',
    cost: '50 tokens', costNote: '6 lives · ~20 min', href: '/games/regressor', icon: '⚔️', tint: '139,92,246' },
  { id: 'survival', title: 'Survival in the Novel', tagline: 'You woke up inside the story. Now survive it.',
    description: 'Pick a novel from the library. Wake up inside its world, armed only with your knowledge of the plot. The more you have read, the longer you live. Reach the end of the arc — or die trying.',
    cost: '50 tokens', costNote: 'Flagship · 5 attempts', href: '/games/survival', icon: '📖', tint: '16,185,129' },
  { id: 'defective-system', title: 'The Defective System', tagline: 'Quest received: slap the Sect Master.',
    description: 'The System has assigned you five impossible, embarrassing, and deeply inadvisable quests. Each one is worse than the last. Survive as long as you can. Each failure is funnier than the last.',
    cost: '25 tokens', costNote: 'One run · ~10 min', href: '/games/defective-system', icon: '⚠️', tint: '244,63,94' },
  { id: 'character-battle', title: 'Character Battle Debate', tagline: 'Pick your fighter. The lore decides.',
    description: 'Pick any two characters from our library — same novel or cross-novel. Set a chapter range for each. A battle is simulated using real lore from the text. Powerscaling, settled.',
    cost: '20 tokens', costNote: 'One match · ~5 min', href: '/games/character-battle', icon: '⚡', tint: '249,115,22' },
  { id: 'trivia', title: 'Trivia Gauntlet', tagline: 'Do you really know your novels?',
    description: 'Pick up to 10 novels. We ask random questions pulled from across them — without telling you which is which. Typos and close answers still count. Get a letter grade and prove your mastery.',
    cost: 'From 10 tokens', costNote: '2 tokens/question · 5–20 Qs', href: '/games/trivia', icon: '🧠', tint: '14,165,233' },
]

function GameCard({ g }: { g: Game }) {
  return (
    <Link href={g.href} className="group block h-full">
      <div className="tnl-panel flex h-full flex-col overflow-hidden transition duration-300 group-hover:-translate-y-1"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center gap-3 p-5 pb-4" style={{ background: `linear-gradient(135deg, rgba(${g.tint},0.18) 0%, rgba(${g.tint},0.04) 100%)` }}>
          <span className="text-3xl">{g.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight" style={{ color: `rgb(${g.tint})` }}>{g.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/55">{g.tagline}</p>
          </div>
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

export default function TestGamePage() {
  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 55% at 50% -10%, rgba(var(--v),0.22) 0%, transparent 55%), radial-gradient(60% 50% at 85% 100%, rgba(var(--v),0.14) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-10 sm:px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--v))' }}>✦ The Arena</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Enter the Game</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/55">
            AI games built from xianxia lore. Recruit disciples, survive inside novels, solve impossible quests.
            Each game costs a flat token fee — no per-message billing, no cut-off mid-dungeon.
          </p>
        </div>

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
