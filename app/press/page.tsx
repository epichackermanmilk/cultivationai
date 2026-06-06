import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Press', robots: { index: false, follow: false } }

// Hidden mockup screens used ONLY to capture clean marketing screenshots at
// phone resolution. Curated, spoiler-light sample content — not real user data.
// Visit /press?s=askbook | character | multi

const AMBER = '#f59e0b'

function Header({ title, sub, tokens = 300 }: { title: string; sub?: string; tokens?: number }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
      <span className="text-sm" style={{ color: 'var(--nc-text2)' }}>← Back</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" style={{ color: AMBER }}>{title}</p>
        {sub && <p className="truncate text-xs" style={{ color: 'var(--nc-text2)' }}>{sub}</p>}
      </div>
      <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
        style={{ background: 'rgba(245,158,11,0.12)', color: AMBER, border: '1px solid rgba(245,158,11,0.4)' }}>⚡ {tokens}</span>
    </div>
  )
}

function Toggle({ active }: { active: 'ask' | 'character' }) {
  const on  = { background: AMBER, color: '#000' }
  const off = { background: 'var(--nc-bg2)', color: 'var(--nc-text2)', border: '1px solid var(--nc-border)' }
  return (
    <div className="flex gap-2 px-4 py-3">
      <div className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold" style={active === 'ask' ? on : off}>📖 Ask the Book</div>
      <div className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold" style={active === 'character' ? on : off}>💬 Character Chat</div>
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed"
      style={{ background: '#2a2750', color: '#e7e7f5' }}>{children}</div>
  )
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
        style={{ background: 'rgba(245,158,11,0.15)' }}>📖</div>
      <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
        style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)', border: '1px solid var(--nc-border)' }}>
        {children}
      </div>
    </div>
  )
}

function CharBubble({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff' }}>FY</div>
      <div className="max-w-[85%] space-y-1.5 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
        style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text)', border: '1px solid var(--nc-border)' }}>
        <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>{name}</p>
        {children}
      </div>
    </div>
  )
}

function InputBar({ placeholder }: { placeholder: string }) {
  return (
    <div className="mt-auto border-t px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--nc-bg2)', color: 'var(--nc-text2)', border: '1px solid var(--nc-border)' }}>{placeholder}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{ background: AMBER, color: '#000' }}>↑</div>
      </div>
      <p className="mt-1.5 text-center text-xs" style={{ color: 'var(--nc-text2)' }}>10 tokens per message</p>
    </div>
  )
}

function Cite({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
      style={{ background: 'rgba(245,158,11,0.12)', color: AMBER }}>📖 {children}</span>
  )
}

export default async function PressPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams
  const screen = s ?? 'askbook'

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {screen === 'character' ? (
        <>
          <Header title="Reverend Insanity" sub="Chatting with Fang Yuan" />
          <Toggle active="character" />
          <div className="flex-1 space-y-4 overflow-hidden px-4 py-3">
            <UserBubble>Do you ever regret the choices you&apos;ve made?</UserBubble>
            <CharBubble name="Fang Yuan">
              <p><em>A cold smile touches my lips.</em> Regret is a luxury for those who have time to waste.</p>
              <p>I have lived five hundred years and died once already. Every choice I make serves my dao — sentiment is merely another Gu to be devoured. You would do well to learn the same.</p>
            </CharBubble>
            <UserBubble>That sounds lonely.</UserBubble>
            <CharBubble name="Fang Yuan">
              <p>Lonely? <em>I almost laugh.</em> The heavens themselves are my enemy. I do not need company — I need only to grow stronger.</p>
            </CharBubble>
          </div>
          <InputBar placeholder="Say something to Fang Yuan…" />
        </>
      ) : screen === 'multi' ? (
        <>
          <Header title="3 novels selected" sub="Alchemy Emperor · Emperor's Domination · Reverend Insanity" />
          <div className="px-4 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {['Alchemy Emperor','Emperor’s Domination','Reverend Insanity'].map(n => (
                <span key={n} className="rounded-full px-2.5 py-1 text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: AMBER, border: '1px solid rgba(245,158,11,0.3)' }}>{n} ✕</span>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-hidden px-4 py-4">
            <UserBubble>Which protagonist is the most ruthless, and why?</UserBubble>
            <BotBubble>
              <p>Across these three, <strong>Fang Yuan</strong> (Reverend Insanity) stands apart for cold, calculated ruthlessness — he treats every relationship as a resource and never acts on sentiment.</p>
              <p><strong>Li Qiye</strong> (Emperor&apos;s Domination) is ruthless toward enemies but rewards loyalty, while <strong>Bai Lianhua</strong> leans on cunning over cruelty.</p>
              <p className="pt-1"><Cite>Compared across all 3 novels</Cite></p>
            </BotBubble>
          </div>
          <InputBar placeholder="Ask across these novels…" />
        </>
      ) : (
        <>
          <Header title="Reverend Insanity" sub="Gu Zhen Ren · 2,334 chapters" />
          <Toggle active="ask" />
          <div className="flex-1 space-y-4 overflow-hidden px-4 py-3">
            <UserBubble>What makes Fang Yuan such a unique protagonist?</UserBubble>
            <BotBubble>
              <p>Fang Yuan breaks the mold of the noble cultivation hero. After dying at the peak of power, he regresses <strong>500 years into his teenage body</strong>, carrying every memory forward — so he plays the entire world like a board he has already seen.</p>
              <p>What makes him singular is his <strong>unflinching self-interest</strong>: he lies, betrays, and sacrifices anyone who stands between him and eternal life, yet his discipline and foresight make him magnetic rather than simply villainous.</p>
              <p className="pt-1"><Cite>Grounded in Ch. 1–40</Cite></p>
            </BotBubble>
          </div>
          <InputBar placeholder="Ask about the story, characters, cultivation system…" />
        </>
      )}
    </div>
  )
}
