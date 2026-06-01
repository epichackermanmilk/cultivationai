'use client'

import { useState, useEffect } from 'react'

// Rotating fun facts + tips shown under a loader so waits feel shorter.
const FACTS: string[] = [
  'Did you know? “Xianxia” means “immortal heroes” — cultivation fantasy rooted in Daoism.',
  'Wuxia is grounded martial arts; xianxia adds gods, demons, and the path to immortality.',
  'System novels — where a game-like “System” guides the hero — exploded in popularity around 2017.',
  'The longest web novels run well past 4,000 chapters and millions of words.',
  'A classic cultivation ladder: Qi Condensation → Foundation Establishment → Core Formation → Nascent Soul.',
  '“Face-slapping” is a beloved trope: the underdog humbling an arrogant young master.',
  'Reverend Insanity is famous for a protagonist who is unapologetically, brilliantly evil.',
  'The “trash who is secretly a genius” is one of the genre’s oldest, most loved setups.',
  'Tip: You can chat with characters from your favorite novels in Character mode.',
  'Tip: Multi-Novel Chat lets you compare power systems across different stories at once.',
  'Tip: Unlocking a novel for chat is completely free — you only spend tokens when you ask.',
  'Tip: Try the Trivia Gauntlet to see how well you really know your novels.',
  'Many isekai heroes “transmigrate” — waking up inside the body of a side character.',
  'A “regressor” dies and returns to the past, keeping their memories to do it all over.',
]

export default function LoadingFacts({
  icon = '⏳',
  title = 'Working…',
  intervalMs = 5000,
  accentClass = 'text-amber-400',
}: {
  icon?: string
  title?: string
  intervalMs?: number
  accentClass?: string
}) {
  const [i, setI] = useState(0)

  useEffect(() => {
    // start on a varied fact without using Math.random at module scope
    const id = setInterval(() => setI(prev => (prev + 1) % FACTS.length), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="text-5xl animate-pulse select-none">{icon}</div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" style={{ color: 'var(--nc-text2)' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" style={{ color: 'var(--nc-text2)' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ color: 'var(--nc-text2)' }} />
      </div>
      <p className={`text-lg font-semibold ${accentClass}`}>{title}</p>
      <p key={i} className="max-w-md text-sm leading-relaxed animate-[fadeIn_0.4s_ease]" style={{ color: 'var(--nc-text2)' }}>
        {FACTS[i]}
      </p>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  )
}
