'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import AuthModal   from '@/components/AuthModal'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

// ── Gradient text style (matches amber button gradient) ───────────────────────
const G: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

// ── Novel covers — 10 live scraped URLs ───────────────────────────────────────
const COVERS = [
  { src: 'https://static.novelbuddy.com/covers/against-the-gods.png',                                               alt: 'Against the Gods'                       },
  { src: 'https://images.novelbin.me/novel/reverend-insanity.jpg',                                                  alt: 'Reverend Insanity'                      },
  { src: 'https://images.novelbin.me/novel/shadow-slave.jpg',                                                       alt: 'Shadow Slave'                           },
  { src: 'https://images.novelbin.me/novel/supreme-magus-novel.jpg',                                               alt: 'Supreme Magus'                          },
  { src: 'https://images.novelbin.me/novel/reincarnation-of-the-strongest-sword-god.jpg',                          alt: 'Reincarnation of the Strongest Sword God'},
  { src: 'https://static.novelbuddy.com/covers/tribulation-of-myriad-races.png',                                    alt: 'Tribulation of Myriad Races'            },
  { src: 'https://images.novelbin.me/novel/the-first-legendary-beast-master.jpg',                                   alt: 'The First Legendary Beast Master'       },
  { src: 'https://static.novelbuddy.com/covers/wizard-starting-with-the-knights-breathing-method.png',             alt: 'Wizard'                                 },
  { src: 'https://images.novelbin.me/novel/tyrant-sky-martial-soul.jpg',                                            alt: 'Tyrant Sky Martial Soul'                },
  { src: 'https://images.novelbin.me/novel/the-mech-touch.jpg',                                                     alt: 'The Mech Touch'                         },
]

const COL_A = [COVERS[0], COVERS[2], COVERS[4], COVERS[6], COVERS[8]]
const COL_B = [COVERS[1], COVERS[3], COVERS[5], COVERS[7], COVERS[9]]

// ── Scrolling cover panel ─────────────────────────────────────────────────────
function CoverPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="flex h-full gap-3 px-3 py-4">
        <div className="flex-1 overflow-hidden">
          <div style={{ animation: 'nb-up 42s linear infinite', willChange: 'transform' }}>
            {[...COL_A, ...COL_A].map((c, i) => (
              <img key={i} src={c.src} alt={c.alt}
                className="mb-3 w-full rounded-xl object-cover shadow-xl"
                style={{ aspectRatio: '3/4', display: 'block' }}
                loading={i < 5 ? 'eager' : 'lazy'}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div style={{ animation: 'nb-down 36s linear infinite', willChange: 'transform' }}>
            {[...COL_B, ...COL_B].map((c, i) => (
              <img key={i} src={c.src} alt={c.alt}
                className="mb-3 w-full rounded-xl object-cover shadow-xl"
                style={{ aspectRatio: '3/4', display: 'block' }}
                loading={i < 5 ? 'eager' : 'lazy'}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32"
        style={{ background: 'linear-gradient(to right, var(--nc-bg) 0%, transparent 100%)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(to bottom, var(--nc-bg) 0%, transparent 100%)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{ background: 'linear-gradient(to top, var(--nc-bg) 0%, transparent 100%)' }} />
    </div>
  )
}

// ── App UI mockups ────────────────────────────────────────────────────────────
function LibraryMockup() {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border overflow-hidden shadow-2xl shadow-black/60"
      style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
      <div className="border-b px-4 py-3 flex items-center gap-3" style={{ borderColor: 'var(--nc-border)' }}>
        <span className="text-xs font-bold" style={G}>NovelCodex</span>
        <div className="flex-1 mx-2 h-5 rounded-md" style={{ background: 'var(--nc-bg3)' }} />
        <div className="h-5 w-8 rounded-md bg-amber-500/20" />
      </div>
      <div className="px-4 py-3">
        <div className="h-7 rounded-lg border flex items-center px-3 gap-2" style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg)' }}>
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 16 16" style={{ color: 'var(--nc-text2)' }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div className="h-2 w-20 rounded-full" style={{ background: 'var(--nc-border)' }} />
        </div>
      </div>
      <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
        {['Cultivation', 'Xianxia', 'Wuxia'].map((g, i) => (
          <span key={g} className={`text-xs rounded-full px-2 py-0.5 ${i === 0 ? 'bg-amber-500/20 border border-amber-500/30' : 'text-zinc-500'}`}
            style={i === 0 ? { ...G } : { background: 'var(--nc-bg3)' }}>{g}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {COVERS.slice(0, 6).map((c, i) => (
          <div key={i} className="rounded-lg overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <img src={c.src} alt="" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.background = `hsl(${220 + i * 25},20%,18%)` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function UnlockMockup() {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border overflow-hidden shadow-2xl shadow-black/60"
      style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
        <span className="text-xs" style={{ color: 'var(--nc-text2)' }}>← Library</span>
      </div>
      <div className="flex gap-3 p-4">
        <img src={COVERS[0].src} alt="" className="w-16 rounded-lg object-cover shadow-lg"
          style={{ aspectRatio: '3/4' }}
          onError={e => { (e.target as HTMLImageElement).style.background = '#1e1b2e' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight mb-1 truncate" style={{ color: 'var(--nc-text)' }}>Against the Gods</p>
          <p className="text-xs mb-2" style={{ color: 'var(--nc-text2)' }}>by Mars Gravity</p>
          <div className="flex gap-1 flex-wrap">
            <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text2)' }}>Cultivation</span>
            <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text2)' }}>Xianxia</span>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button className="w-full rounded-xl py-2.5 text-xs font-bold text-black"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }}>
          Unlock for Chat — 50 tokens
        </button>
      </div>
      <div className="border-t px-4 py-3 space-y-1.5" style={{ borderColor: 'var(--nc-border)' }}>
        {[100, 88, 76, 55].map((w, i) => (
          <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}%`, background: 'var(--nc-bg3)' }} />
        ))}
      </div>
    </div>
  )
}

function ChatMockup() {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border overflow-hidden shadow-2xl shadow-black/60"
      style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
        <p className="text-xs font-bold" style={{ color: 'var(--nc-text)' }}>AI Chat — Against the Gods</p>
        <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>1,600+ chapters indexed</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="flex justify-end">
          <div className="rounded-xl rounded-br-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 max-w-[80%]">
            <p className="text-xs" style={{ color: 'var(--nc-text)' }}>Who is Yun Che and what's his cultivation realm?</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-xl rounded-bl-sm border px-3 py-2 max-w-[85%]"
            style={{ background: 'var(--nc-bg3)', borderColor: 'var(--nc-border)' }}>
            <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--nc-text2)' }}>
              Yun Che is the protagonist — a young man who died and was reborn with the Evil God&apos;s bloodline...
            </p>
            <div className="h-1.5 w-3/4 rounded-full mb-1" style={{ background: 'var(--nc-border)' }} />
            <div className="h-1.5 w-1/2 rounded-full" style={{ background: 'var(--nc-border)' }} />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-xl rounded-br-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 max-w-[80%]">
            <p className="text-xs" style={{ color: 'var(--nc-text)' }}>What is the highest realm in the novel?</p>
          </div>
        </div>
      </div>
      <div className="border-t px-3 py-3 flex gap-2" style={{ borderColor: 'var(--nc-border)' }}>
        <div className="flex-1 h-7 rounded-lg border flex items-center px-3" style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg)' }}>
          <div className="h-1.5 w-24 rounded-full" style={{ background: 'var(--nc-border)' }} />
        </div>
        <div className="h-7 w-12 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }}>
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-black">
            <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Reviews ───────────────────────────────────────────────────────────────────
const REVIEWS = [
  {
    name: 'sanriih0e',
    text: 'I stopped reading to focus on studying and was 500 chapters behind and completely forgot the entire volume I was in so I asked for a recap and was back up to speed in 3mins',
    stars: 5,
  },
  {
    name: 'CosmicStorm86',
    text: "I like using this to make sure I don't waste time with stories that end up being sh*t lol",
    stars: 5,
  },
  {
    name: 'nightpine55',
    text: 'Whenever I read and forget a character I use this to remind myself of everything',
    stars: 5,
  },
  {
    name: 'SparklyJellyfish',
    text: 'I use this to research powerscaling in different novels for my tiktoks',
    stars: 5,
  },
  {
    name: 'lilyspace',
    text: 'I like da multichat cuz I just add every novel, describe what I\'m looking for and it gives me banger picks',
    stars: 5,
  },
  {
    name: 'SillyKitten22',
    text: 'Been reading cultivation novels since 2014. This is genuinely the first tool that makes tracking realms, factions and power rankings manageable in novels with 2000+ chapters.',
    stars: 5,
  },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    category: 'General',
    items: [
      { q: 'What is NovelCodex?', a: 'NovelCodex is an AI-powered reading companion for xianxia, cultivation, and wuxia web novels. Ask any question about a story and get accurate, source-grounded answers drawn directly from the indexed chapters.' },
      { q: 'Who is NovelCodex for?', a: 'Anyone who reads web novels — whether you want to catch up after a long break, settle a debate about cultivation realms, or find out if a character survives without reading 800 chapters.' },
      { q: 'Is NovelCodex free to use?', a: 'Yes. You get 100 free tokens on signup with no credit card required. Additional tokens can be purchased whenever you need them.' },
      { q: 'How do I get started?', a: 'Create a free account, browse the library, click "Unlock for Chat" on any novel, and start asking questions.' },
    ],
  },
  {
    category: 'How It Works',
    items: [
      { q: 'How does the AI chat work?', a: 'We use retrieval-augmented generation (RAG) to index every chapter of a novel into a vector database. When you ask a question, we search those chapters and synthesize an accurate answer from the actual text — no hallucination.' },
      { q: 'Can it answer spoiler questions?', a: 'Yes. You can ask anything — including "does X character die?" or "who wins in the final battle?" The AI draws from all indexed chapters.' },
      { q: 'How accurate are the answers?', a: 'Very accurate for factual questions about plot, characters, and cultivation systems. Every answer is sourced from the indexed chapter text. We always recommend reading the original for nuance.' },
      { q: 'What is multi-novel chat?', a: 'Multi-novel chat lets you ask questions that span multiple novels at once — compare cultivation systems, debate which protagonist would win, or find similar characters across different stories.' },
    ],
  },
  {
    category: 'Tokens & Billing',
    items: [
      { q: 'What are tokens?', a: 'Tokens are the currency for AI chat. Each message costs approximately 10 tokens. Unlocking a novel for chat also costs tokens (typically 50–100 depending on length).' },
      { q: 'Do tokens expire?', a: 'Never. Tokens you purchase are yours indefinitely — no subscription required, no monthly reset.' },
      { q: 'What payment options are available?', a: 'Token purchases and subscriptions are coming soon. Currently all users receive 100 free tokens on signup.' },
      { q: 'What is the subscription?', a: 'Subscriptions offer a monthly token allowance at a lower per-token cost than one-time purchases — ideal for readers who use NovelCodex daily.' },
    ],
  },
  {
    category: 'Novels & Content',
    items: [
      { q: 'Which novels are available?', a: 'We index thousands of titles spanning cultivation, xianxia, fantasy, sci-fi, and more — including Against the Gods, Reverend Insanity, Shadow Slave, Supreme Magus, Reincarnation of the Strongest Sword God, and thousands of others across multiple platforms.' },
      { q: 'Can I request a novel?', a: 'Yes. Use the feedback widget on any page or the support form to request a specific title. Highly requested novels are prioritized.' },
      { q: 'How often are new novels added?', a: 'New novels are added weekly from the top web-novel platforms. The index is updated continuously as new chapters are published.' },
      { q: 'Who owns the indexed content?', a: 'All original novel content remains the property of its respective authors and publishers. NovelCodex indexes chapter text solely for AI-powered search and conversation, and does not redistribute raw text to end users.' },
    ],
  },
]

function FaqBlock() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="space-y-10">
      {FAQ.map(section => (
        <div key={section.category}>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={G}>{section.category}</p>
          <div>
            {section.items.map(item => (
              <div key={item.q} className="border-t" style={{ borderColor: 'var(--nc-border)' }}>
                <button
                  type="button"
                  onClick={() => setOpen(open === item.q ? null : item.q)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--nc-text)' }}>{item.q}</span>
                  <svg viewBox="0 0 10 6" fill="none"
                    className="h-3 w-3 shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--nc-text2)', transform: open === item.q ? 'rotate(180deg)' : 'none' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {/* CSS grid trick for smooth height animation — no JS height calc needed */}
                <div className="grid transition-all duration-200 ease-out"
                  style={{ gridTemplateRows: open === item.q ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <div className="pb-4 pr-8 text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t" style={{ borderColor: 'var(--nc-border)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Pill button styles ────────────────────────────────────────────────────────
const btnPrimary = 'rounded-full px-8 py-3.5 text-sm font-bold text-black transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0'
const btnPrimaryStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  boxShadow: '0 8px 24px rgba(245,158,11,0.30)',
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth()
  const [showAuth,    setShowAuth]    = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('nb_welcomed')) setShowWelcome(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash.includes('access_token='))
      window.location.replace('/auth/callback' + hash)
  }, [])

  const dismissWelcome = () => {
    localStorage.setItem('nb_welcomed', '1')
    setShowWelcome(false)
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden"
      style={{
        color: 'var(--nc-text)',
        background: 'var(--nc-bg)',
        backgroundImage: `
          radial-gradient(ellipse 70% 50% at 15% 0%, rgba(109,40,217,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 85% 100%, rgba(217,119,6,0.07) 0%, transparent 55%)
        `,
      }}>

      {/* ── Welcome popup ──────────────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={dismissWelcome}>
          <div className="relative w-full max-w-md rounded-2xl border p-7 shadow-2xl"
            style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={dismissWelcome}
              className="absolute right-4 top-4 text-lg leading-none transition hover:text-zinc-300"
              style={{ color: 'var(--nc-text2)' }}>
              ×
            </button>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={G}>Welcome</p>
            <h2 className="mb-2 text-xl font-bold" style={{ color: 'var(--nc-text)' }}>NovelCodex</h2>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              Ask anything about thousands of web novels — characters, cultivation systems, plot, lore,
              spoilers — and get instant AI-powered answers from the actual text.
            </p>
            <div className="mb-6 space-y-3">
              {([
                ['Browse', 'Search thousands of web novels'],
                ['Unlock', 'Activate AI on any novel with tokens'],
                ['Ask',    'Chat with the book — characters, lore, anything'],
              ] as [string, string][]).map(([title, desc], idx) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-400">{idx + 1}</span>
                  </span>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>{title}</span>
                    <span className="text-sm" style={{ color: 'var(--nc-text2)' }}> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/library" onClick={dismissWelcome}
                className="flex-1 rounded-full border py-2.5 text-sm font-medium text-center transition hover:border-amber-500/50"
                style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}>
                Browse Library
              </Link>
              <button
                onClick={() => { dismissWelcome(); if (!user) setShowAuth(true) }}
                className={`flex-1 ${btnPrimary}`}
                style={btnPrimaryStyle}>
                Get Started
              </button>
            </div>
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--nc-text2)' }}>
              100 free tokens · No credit card required
            </p>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[var(--nc-border)]"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}>
        <Link href="/library" className="group">
          <span className="block text-xl font-bold tracking-tight" style={G}>NovelCodex</span>
          <span className="hidden sm:block text-xs mt-0.5" style={{ color: 'var(--nc-text2)' }}>AI-powered web novel reader</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/library"
            className="hidden sm:flex items-center rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-400">
            Library
          </Link>
          <Link href="/recommend"
            className="hidden sm:flex items-center rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-400">
            Recommend
          </Link>
          <Link href="/chat"
            className="hidden sm:flex items-center rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-400">
            ✦ Multi-Novel Chat
          </Link>
          <TokenWidget />
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative flex overflow-hidden" style={{ minHeight: '100vh' }}>
        <div className="relative z-10 flex w-full flex-col justify-center px-8 py-20 md:w-1/2 md:px-12 lg:px-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold w-fit" style={G}>
            AI Novel Reader
          </div>
          <h1 className="mb-6 font-extrabold leading-[1.05] tracking-tight"
            style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
            <span style={G}>Every answer.</span>
            <br />
            <span style={{ color: 'var(--nc-text)' }}>Inside the book.</span>
          </h1>
          <p className="mb-8 max-w-md text-base leading-relaxed md:text-lg" style={{ color: 'var(--nc-text2)' }}>
            Ask anything about characters, plot, cultivation systems, and lore across thousands of web novels.
            NovelCodex knows every chapter.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {user ? (
              <Link href="/library" className={btnPrimary} style={btnPrimaryStyle}>
                Go to Library
              </Link>
            ) : (
              <>
                <button onClick={() => setShowAuth(true)} className={btnPrimary} style={btnPrimaryStyle}>
                  Get Started Free
                </button>
                <Link href="/library"
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 transition hover:bg-amber-500/10"
                  style={{ borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b' }}>
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                    <path d="M3 13L13 3M13 3H6M13 3v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </>
            )}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--nc-text2)' }}>
            100 free tokens on signup · No credit card required
          </p>
        </div>
        <div className="absolute right-0 top-0 hidden h-full w-1/2 md:block">
          <CoverPanel />
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-[var(--nc-border)] py-8" style={{ background: 'var(--nc-bg2)' }}>
        <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-6 px-6 text-center">
          {[
            { val: '50,000+', label: 'Novels indexed'       },
            { val: '100M+',   label: 'Chapters searchable'  },
            { val: '250+',    label: 'Novel platforms'       },
            { val: '24/7',    label: 'Always up to date'    },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold" style={G}>{s.val}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--nc-text2)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How to use NovelCodex ──────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <p className="text-center text-xs font-bold uppercase tracking-widest mb-3" style={G}>How it works</p>
        <h2 className="text-center text-3xl font-extrabold mb-16 leading-tight" style={{ color: 'var(--nc-text)' }}>
          Three steps to know everything<br />about any novel
        </h2>

        {/* Step 1 */}
        <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
          <div className="flex-1 order-2 md:order-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={G}>Browse the Library</p>
            <h3 className="text-3xl font-bold mb-5" style={{ color: 'var(--nc-text)' }}>
              Search thousands of web novels
            </h3>
            <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--nc-text2)' }}>
              Filter by genre, chapter count, or title. From Reverend Insanity to Against the Gods — find exactly what you&apos;re looking for, or discover something new.
            </p>
            <Link href="/library"
              className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80" style={G}>
              Browse the library
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <div className="flex-1 order-1 md:order-2 w-full">
            <LibraryMockup />
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
          <div className="flex-1 w-full">
            <UnlockMockup />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={G}>Unlock for Chat</p>
            <h3 className="text-3xl font-bold mb-5" style={{ color: 'var(--nc-text)' }}>
              Activate AI on any novel in seconds
            </h3>
            <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--nc-text2)' }}>
              Spend tokens to unlock a novel. NovelCodex reads every chapter and builds a searchable AI knowledge base — characters, realms, factions, everything.
            </p>
            <Link href="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80" style={G}>
              Get tokens
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 order-2 md:order-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={G}>Ask Anything</p>
            <h3 className="text-3xl font-bold mb-5" style={{ color: 'var(--nc-text)' }}>
              Chat with the novel like you chat with a friend
            </h3>
            <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--nc-text2)' }}>
              Ask about characters, plot twists, cultivation ranks, hidden lore, spoilers — or compare across multiple novels at once. Instant answers, every time.
            </p>
            <Link href="/chat"
              className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80" style={G}>
              Try multi-novel chat
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <div className="flex-1 order-1 md:order-2 w-full">
            <ChatMockup />
          </div>
        </div>
      </section>

      {/* ── Cover wall ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 overflow-hidden" style={{ background: '#0a0a0b' }}>
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-3" style={G}>The Library</p>
          <h2 className="text-center text-3xl font-extrabold mb-12" style={{ color: 'var(--nc-text)' }}>
            Thousands of novels, one AI
          </h2>
          <div className="grid grid-cols-5 gap-3 sm:gap-4">
            {COVERS.map((c, i) => (
              <div key={i} className="overflow-hidden rounded-2xl shadow-2xl shadow-black/70 transition-transform duration-300 hover:scale-[1.03]"
                style={{ aspectRatio: '3/4' }}>
                <img src={c.src} alt={c.alt} className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.background = `hsl(${230 + i * 15},20%,12%)` }} />
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-10" style={{ color: 'var(--nc-text2)' }}>
            New titles added every week.{' '}
            <Link href="/library" className="font-semibold transition hover:opacity-80" style={G}>Browse the full library →</Link>
          </p>
        </div>
      </section>

      {/* ── Use cases ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-[var(--nc-border)] py-20" style={{ background: 'var(--nc-bg2)' }}>
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-3" style={G}>Use cases</p>
          <h2 className="text-center text-3xl font-extrabold mb-16" style={{ color: 'var(--nc-text)' }}>
            What readers use it for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Catch up instantly',
                desc: 'Missed 200 chapters? Ask NovelCodex for a summary of everything that happened. Be back in the story in minutes.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Find hidden lore',
                desc: "Remember reading something about a secret technique? NovelCodex finds it across thousands of chapters instantly.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Settle debates',
                desc: "Who's stronger — Yun Che or Ling Han? Get a chapter-referenced answer with actual power levels and context.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Compare across novels',
                desc: 'How does the cultivation system in ISSTH compare to Reverend Insanity? Ask and get a detailed breakdown.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Track every character',
                desc: 'Forget who that minor sect elder was? Ask for a full breakdown of any character, their background, and their fate.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Spoiler control',
                desc: 'Find out if a character dies before investing 800 chapters. You control exactly how much you want to know.',
              },
            ].map(uc => (
              <div key={uc.title} className="rounded-2xl border p-6 transition hover:border-amber-500/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(109,40,217,0.05) 100%)',
                  borderColor: 'rgba(245,158,11,0.15)',
                }}>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--nc-text)' }}>{uc.title}</h3>
                <p className="text-base leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 overflow-hidden">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-3" style={G}>Reviews</p>
          <h2 className="text-center text-3xl font-extrabold mb-2" style={{ color: 'var(--nc-text)' }}>
            What readers are saying
          </h2>
          <p className="text-center text-sm mb-12" style={{ color: 'var(--nc-text2)' }}>
            Thousands of readers, one verdict.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REVIEWS.map(r => (
              <div key={r.name} className="rounded-2xl border p-6 flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(109,40,217,0.04) 100%)',
                  borderColor: 'rgba(245,158,11,0.18)',
                }}>
                <p className="text-sm leading-relaxed flex-1 mb-5" style={{ color: 'var(--nc-text)' }}>{r.text}</p>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--nc-text2)' }}>@{r.name}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <span key={i} className="text-sm" style={G}>★</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (full-width band) ───────────────────────────────────────────── */}
      <section className="relative z-10 py-24 border-y border-amber-500/20"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.05) 50%, rgba(109,40,217,0.06) 100%)',
        }}>
        <div className="mx-auto max-w-4xl px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-extrabold mb-3" style={G}>
              Start for free today.
            </h2>
            <p className="text-base" style={{ color: 'var(--nc-text2)' }}>
              100 tokens on signup. No credit card. No commitment.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            {user ? (
              <Link href="/library" className={btnPrimary} style={btnPrimaryStyle}>
                Go to Library
              </Link>
            ) : (
              <>
                <button onClick={() => setShowAuth(true)} className={btnPrimary} style={btnPrimaryStyle}>
                  Create Free Account
                </button>
                <Link href="/library"
                  className="rounded-full border px-8 py-3.5 text-sm font-semibold transition hover:border-amber-500/50"
                  style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text2)' }}>
                  Browse first
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <p className="text-center text-xs font-bold uppercase tracking-widest mb-3" style={G}>FAQ</p>
        <h2 className="text-center text-3xl font-extrabold mb-16" style={{ color: 'var(--nc-text)' }}>
          Frequently asked questions
        </h2>
        <FaqBlock />
      </section>

      <Footer />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
