'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthModal   from '@/components/AuthModal'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

// ── Gradient text style (brand amber) ─────────────────────────────────────────
const G: React.CSSProperties = {
  background: 'var(--nc-grad-text)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

// ── Featured novels — the 8 live during the curated preview ────────────────────
// Covers link to working featured pages only (no dead non-preview clicks).
const COVERS = [
  { src: 'https://static.novelbuddy.com/covers/against-the-gods.png',         alt: 'Against the Gods',           slug: 'against-the-gods'            },
  { src: 'https://images.novelbin.me/novel/reverend-insanity.jpg',            alt: 'Reverend Insanity',          slug: 'reverend-insanity'           },
  { src: 'https://images.novelbin.me/novel/shadow-slave.jpg',                 alt: 'Shadow Slave',               slug: 'shadow-slave'                },
  { src: 'https://images.novelbin.me/novel/supreme-magus-novel.jpg',          alt: 'Supreme Magus',              slug: 'supreme-magus'               },
  { src: 'https://images.novelbin.me/novel/i-shall-seal-the-heavens.jpg',     alt: 'I Shall Seal the Heavens',   slug: 'i-shall-seal-the-heavens'    },
  { src: 'https://images.novelbin.me/novel/renegade-immortal.jpg',            alt: 'Renegade Immortal',          slug: 'renegade-immortal'           },
  { src: 'https://images.novelbin.me/novel/a-will-eternal.jpg',               alt: 'A Will Eternal',             slug: 'a-will-eternal'              },
  { src: 'https://images.novelbin.me/novel/warlock-of-the-magus-world.jpg',   alt: 'Warlock of the Magus World', slug: 'warlock-of-the-magus-world'  },
]

const COL_A = [COVERS[0], COVERS[2], COVERS[4], COVERS[6]]
const COL_B = [COVERS[1], COVERS[3], COVERS[5], COVERS[7]]

// ── Scrolling cover panel ─────────────────────────────────────────────────────
function CoverPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="flex h-full gap-3 px-3 py-4">
        <div className="flex-1 overflow-hidden">
          <div style={{ animation: 'nb-up 42s linear infinite', willChange: 'transform' }}>
            {[...COL_A, ...COL_A].map((c, i) => (
              <Link key={i} href={`/novel/${c.slug}`} className="mb-3 block overflow-hidden rounded-[var(--nc-r-lg)] shadow-[var(--nc-shadow-lg)] transition-transform duration-300 hover:scale-[1.03]">
                <img src={c.src} alt={c.alt}
                  className="w-full object-cover"
                  style={{ aspectRatio: '3/4', display: 'block' }}
                  loading={i < 4 ? 'eager' : 'lazy'}
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
              </Link>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div style={{ animation: 'nb-down 36s linear infinite', willChange: 'transform' }}>
            {[...COL_B, ...COL_B].map((c, i) => (
              <Link key={i} href={`/novel/${c.slug}`} className="mb-3 block overflow-hidden rounded-[var(--nc-r-lg)] shadow-[var(--nc-shadow-lg)] transition-transform duration-300 hover:scale-[1.03]">
                <img src={c.src} alt={c.alt}
                  className="w-full object-cover"
                  style={{ aspectRatio: '3/4', display: 'block' }}
                  loading={i < 4 ? 'eager' : 'lazy'}
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
              </Link>
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
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[var(--nc-r-2xl)] border shadow-[var(--nc-shadow-lg)]"
      style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
        <span className="font-display text-sm font-bold" style={G}>NovelCodex</span>
        <div className="mx-2 h-5 flex-1 rounded-md" style={{ background: 'var(--nc-bg3)' }} />
        <div className="h-5 w-8 rounded-md" style={{ background: 'var(--nc-amber-soft)' }} />
      </div>
      <div className="px-4 py-3">
        <div className="flex h-7 items-center gap-2 rounded-lg border px-3" style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg)' }}>
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 16 16" style={{ color: 'var(--nc-text2)' }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div className="h-2 w-20 rounded-full" style={{ background: 'var(--nc-border)' }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {['Cultivation', 'Xianxia', 'Wuxia'].map(g => (
          <span key={g} className="rounded-full border px-2 py-0.5 text-xs" style={{ ...G, background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)' }}>{g}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {COVERS.slice(0, 6).map((c, i) => (
          <div key={i} className="overflow-hidden rounded-lg" style={{ aspectRatio: '3/4' }}>
            <img src={c.src} alt="" className="h-full w-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.background = `hsl(${30 + i * 8},35%,18%)` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function UnlockMockup() {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[var(--nc-r-2xl)] border shadow-[var(--nc-shadow-lg)]"
      style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
        <span className="text-xs" style={{ color: 'var(--nc-text2)' }}>← Library</span>
      </div>
      <div className="flex gap-3 p-4">
        <img src={COVERS[0].src} alt="" className="w-16 rounded-lg object-cover shadow-[var(--nc-shadow-md)]"
          style={{ aspectRatio: '3/4' }}
          onError={e => { (e.target as HTMLImageElement).style.background = '#2a1e0e' }} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 truncate text-sm font-bold leading-tight" style={{ color: 'var(--nc-text)' }}>Against the Gods</p>
          <p className="mb-2 text-xs" style={{ color: 'var(--nc-text2)' }}>by Mars Gravity</p>
          <div className="flex flex-wrap gap-1">
            <span className="rounded-full border px-2 py-0.5 text-xs" style={{ ...G, background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)' }}>Cultivation</span>
            <span className="rounded-full border px-2 py-0.5 text-xs" style={{ ...G, background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)' }}>Xianxia</span>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button className="w-full rounded-[var(--nc-r-md)] py-2.5 text-xs font-bold"
          style={{ background: 'var(--nc-grad)', color: 'var(--nc-amber-ink)' }}>
          Chat with this Novel
        </button>
      </div>
      <div className="space-y-1.5 border-t px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
        {[100, 88, 76, 55].map((w, i) => (
          <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}%`, background: 'var(--nc-bg3)' }} />
        ))}
      </div>
    </div>
  )
}

function ChatMockup() {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[var(--nc-r-2xl)] border shadow-[var(--nc-shadow-lg)]"
      style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--nc-border)' }}>
        <p className="text-xs font-bold" style={{ color: 'var(--nc-text)' }}>AI Chat — Against the Gods</p>
        <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>2,187 chapters indexed</p>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-[var(--nc-r-md)] rounded-br-sm border px-3 py-2"
            style={{ background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)' }}>
            <p className="text-xs" style={{ color: 'var(--nc-text)' }}>Who is Yun Che and what&apos;s his cultivation realm?</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-[var(--nc-r-md)] rounded-bl-sm border px-3 py-2"
            style={{ background: 'var(--nc-bg3)', borderColor: 'var(--nc-border)' }}>
            <p className="mb-1.5 text-xs leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              Yun Che is the protagonist — a young man who died and was reborn with the Evil God&apos;s bloodline...
            </p>
            <div className="mb-1 h-1.5 w-3/4 rounded-full" style={{ background: 'var(--nc-border)' }} />
            <div className="h-1.5 w-1/2 rounded-full" style={{ background: 'var(--nc-border)' }} />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-[var(--nc-r-md)] rounded-br-sm border px-3 py-2"
            style={{ background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)' }}>
            <p className="text-xs" style={{ color: 'var(--nc-text)' }}>What is the highest realm in the novel?</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-t px-3 py-3" style={{ borderColor: 'var(--nc-border)' }}>
        <div className="flex h-7 flex-1 items-center rounded-lg border px-3" style={{ borderColor: 'var(--nc-border)', background: 'var(--nc-bg)' }}>
          <div className="h-1.5 w-24 rounded-full" style={{ background: 'var(--nc-border)' }} />
        </div>
        <div className="flex h-7 w-12 items-center justify-center rounded-lg"
          style={{ background: 'var(--nc-grad)' }}>
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--nc-amber-ink)' }}>
            <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Reviews ───────────────────────────────────────────────────────────────────
const REVIEWS = [
  { name: 'sanriih0e',       stars: 5, text: 'I stopped reading to focus on studying and was 500 chapters behind and completely forgot the entire volume I was in so I asked for a recap and was back up to speed in 3mins' },
  { name: 'CosmicStorm86',   stars: 5, text: "I like using this to make sure I don't waste time with stories that end up being sh*t lol" },
  { name: 'nightpine55',     stars: 5, text: 'Whenever I read and forget a character I use this to remind myself of everything' },
  { name: 'SparklyJellyfish', stars: 5, text: 'I use this to research powerscaling in different novels for my tiktoks' },
  { name: 'lilyspace',       stars: 5, text: 'I like da multichat cuz I just add every novel, describe what I\'m looking for and it gives me banger picks' },
  { name: 'SillyKitten22',   stars: 5, text: 'Been reading cultivation novels since 2014. This is genuinely the first tool that makes tracking realms, factions and power rankings manageable in novels with 2000+ chapters.' },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    category: 'General',
    items: [
      { q: 'What is NovelCodex?', a: 'NovelCodex is an AI-powered reading companion for xianxia, cultivation, and wuxia web novels. Ask any question about a story and get accurate, source-grounded answers drawn directly from the indexed chapters.' },
      { q: 'Who is NovelCodex for?', a: 'Anyone who reads web novels — whether you want to catch up after a long break, settle a debate about cultivation realms, or find out if a character survives without reading 800 chapters.' },
      { q: 'Is NovelCodex free to use?', a: 'Yes. You get 50 free tokens on signup with no credit card required (40 instantly, plus 10 more when you add your name and age). Every featured novel is ready to chat with for free — you only spend tokens when you chat. Additional tokens can be purchased whenever you need them.' },
      { q: 'How do I get started?', a: 'Create a free account, browse the featured library, pick any novel, and start asking questions — every featured novel is ready instantly.' },
    ],
  },
  {
    category: 'How It Works',
    items: [
      { q: 'How does the AI chat work?', a: 'We use retrieval-augmented generation (RAG) to index every chapter of a novel into a vector database. When you ask a question, we search those chapters and synthesize an accurate answer from the actual text — no hallucination.' },
      { q: 'Can it answer spoiler questions?', a: 'Yes — and you control them. Ask anything including "does X die?", or set a chapter ceiling with the spoiler shield so answers never reveal beyond where you\'ve read.' },
      { q: 'How accurate are the answers?', a: 'Very accurate for factual questions about plot, characters, and cultivation systems. Every answer is sourced from the indexed chapter text. We always recommend reading the original for nuance.' },
      { q: 'What is multi-novel chat?', a: 'Multi-novel chat lets you ask questions that span multiple novels at once — compare cultivation systems, debate which protagonist would win, or find similar characters across different stories.' },
    ],
  },
  {
    category: 'Tokens & Billing',
    items: [
      { q: 'What are tokens?', a: 'Tokens are the currency for AI chat. Each message costs 10 tokens. Every featured novel is ready to chat with for free — you only spend tokens when you actually chat with the story.' },
      { q: 'Do tokens expire?', a: 'Never. Tokens you purchase are yours indefinitely — no subscription required, no monthly reset.' },
      { q: 'What payment options are available?', a: 'New users receive 50 free tokens on signup. You can buy more tokens any time from the shop with a one-time purchase, or subscribe for a monthly token allowance at a lower per-token rate.' },
      { q: 'What is the subscription?', a: 'Subscriptions offer a monthly token allowance at a lower per-token cost than one-time purchases — ideal for readers who use NovelCodex daily.' },
    ],
  },
  {
    category: 'Novels & Content',
    items: [
      { q: 'Which novels are available?', a: 'We\'re in curated preview — eight hand-picked, fully-indexed cultivation epics including Reverend Insanity, Against the Gods, Shadow Slave, Supreme Magus, I Shall Seal the Heavens, Renegade Immortal, A Will Eternal, and Warlock of the Magus World. Join the waitlist to be notified as we add more.' },
      { q: 'Can I request a novel?', a: 'Yes. Use the feedback widget on any page or join the waitlist to request a specific title. Highly requested novels are prioritized as we expand.' },
      { q: 'How often are new novels added?', a: 'We\'re expanding the curated library steadily. Join the waitlist and we\'ll email you the moment new titles go live.' },
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
const btnPrimary = 'rounded-full px-8 py-3.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0'
const btnPrimaryStyle: React.CSSProperties = {
  background: 'var(--nc-grad)',
  color: 'var(--nc-amber-ink)',
  boxShadow: '0 8px 24px rgba(245,158,11,0.28)',
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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden pb-16 sm:pb-0"
      style={{
        color: 'var(--nc-text)',
        background: 'var(--nc-bg)',
        backgroundImage: `
          radial-gradient(ellipse 70% 50% at 15% 0%, rgba(245,158,11,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 85% 100%, rgba(217,119,6,0.08) 0%, transparent 55%)
        `,
      }}>

      {/* ── Welcome popup ──────────────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 nc-fade-in"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
          onClick={dismissWelcome}>
          <div className="relative w-full max-w-md rounded-[var(--nc-r-2xl)] border p-7 shadow-[var(--nc-shadow-lg)] nc-fade-up"
            style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={dismissWelcome}
              className="absolute right-4 top-4 text-lg leading-none transition hover:opacity-70"
              style={{ color: 'var(--nc-text2)' }}>
              ×
            </button>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={G}>Welcome</p>
            <h2 className="font-display mb-2 text-2xl font-bold" style={{ color: 'var(--nc-text)' }}>NovelCodex</h2>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              Ask anything about eight hand-picked cultivation epics — characters, systems, plot, lore,
              spoilers — and get instant AI answers from the actual text.
            </p>
            <div className="mb-6 space-y-3">
              {([
                ['Browse', 'Eight fully-indexed featured novels'],
                ['Pick',   'Choose any novel — ready instantly'],
                ['Ask',    'Chat with the book — characters, lore, anything'],
              ] as [string, string][]).map(([title, desc], idx) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                    style={{ background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--nc-amber)' }}>{idx + 1}</span>
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
                className="flex-1 rounded-full px-8 py-3.5 text-center text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'var(--nc-bg3)', color: 'var(--nc-text)', border: '1px solid var(--nc-border)' }}>
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
              50 free tokens · No credit card required
            </p>
          </div>
        </div>
      )}

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative flex overflow-hidden" style={{ minHeight: '100vh' }}>
        <div className="relative z-10 flex w-full flex-col justify-center px-8 py-20 md:w-1/2 md:px-12 lg:px-16">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
            style={{ ...G, background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)' }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--nc-amber)' }} />
            Curated preview · 8 featured novels
          </div>
          <h1 className="font-display mb-6 font-semibold leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(3rem, 5.5vw, 5rem)' }}>
            <span style={G}>Every answer.</span>
            <br />
            <span style={{ color: 'var(--nc-text)' }}>Inside the book.</span>
          </h1>
          <p className="mb-8 max-w-md text-base leading-relaxed md:text-lg" style={{ color: 'var(--nc-text2)' }}>
            Ask anything about characters, plot, cultivation systems, and lore.
            NovelCodex has read every chapter — so you can pick up right where you left off.
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
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 transition hover:bg-[var(--nc-amber-soft)]"
                  style={{ borderColor: 'var(--nc-amber-line)', color: 'var(--nc-amber)' }}
                  aria-label="Browse the library">
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                    <path d="M3 13L13 3M13 3H6M13 3v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </>
            )}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--nc-text2)' }}>
            50 free tokens on signup · No credit card required
          </p>
        </div>
        <div className="absolute right-0 top-0 hidden h-full w-1/2 md:block">
          <CoverPanel />
        </div>
      </section>

      {/* ── Stats (honest, curated-preview framing) ────────────────────────── */}
      <section className="relative z-10 border-y py-8" style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-6 text-center sm:grid-cols-4">
          {[
            { val: '8',       label: 'Featured novels'      },
            { val: '18,000+', label: 'Chapters indexed'     },
            { val: '100%',    label: 'Source-grounded'      },
            { val: '24/7',    label: 'Always current'       },
          ].map(s => (
            <div key={s.label}>
              <p className="font-display text-3xl font-bold" style={G}>{s.val}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--nc-text2)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest" style={G}>How it works</p>
        <h2 className="font-display mb-16 text-center text-4xl font-semibold leading-tight" style={{ color: 'var(--nc-text)' }}>
          Three steps to know everything<br />about any novel
        </h2>

        {/* Step 1 */}
        <div className="mb-20 flex flex-col items-center gap-12 md:flex-row">
          <div className="order-2 flex-1 md:order-1">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={G}>Browse the Library</p>
            <h3 className="font-display mb-5 text-3xl font-semibold" style={{ color: 'var(--nc-text)' }}>
              Eight hand-picked cultivation epics
            </h3>
            <p className="mb-6 text-lg leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              From Reverend Insanity to Against the Gods — every featured novel is fully indexed, chapter by chapter,
              and ready the instant you open it.
            </p>
            <Link href="/library"
              className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80" style={G}>
              Browse the library
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <div className="order-1 w-full flex-1 md:order-2">
            <LibraryMockup />
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-20 flex flex-col items-center gap-12 md:flex-row">
          <div className="w-full flex-1">
            <UnlockMockup />
          </div>
          <div className="flex-1">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={G}>Ready Instantly</p>
            <h3 className="font-display mb-5 text-3xl font-semibold" style={{ color: 'var(--nc-text)' }}>
              Every novel is ready the moment you pick it
            </h3>
            <p className="mb-6 text-lg leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              No setup, no waiting. NovelCodex has read every chapter and built a searchable knowledge base —
              characters, realms, factions, everything. You only spend tokens when you chat.
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
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <div className="order-2 flex-1 md:order-1">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={G}>Ask Anything</p>
            <h3 className="font-display mb-5 text-3xl font-semibold" style={{ color: 'var(--nc-text)' }}>
              Chat with the novel like you chat with a friend
            </h3>
            <p className="mb-6 text-lg leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
              Ask about characters, plot twists, cultivation ranks, hidden lore, spoilers — or compare across
              multiple novels at once. Instant answers, every time.
            </p>
            <Link href="/chat"
              className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80" style={G}>
              Try multi-novel chat
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <div className="order-1 w-full flex-1 md:order-2">
            <ChatMockup />
          </div>
        </div>
      </section>

      {/* ── Cover wall ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden py-20" style={{ background: 'var(--nc-bg)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest" style={G}>The Library</p>
          <h2 className="font-display mb-12 text-center text-4xl font-semibold" style={{ color: 'var(--nc-text)' }}>
            Eight worlds. Every chapter. One AI.
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {COVERS.map((c, i) => (
              <Link key={i} href={`/novel/${c.slug}`}
                className="block overflow-hidden rounded-[var(--nc-r-xl)] shadow-[var(--nc-shadow-lg)] transition-transform duration-300 hover:scale-[1.03]"
                style={{ aspectRatio: '3/4' }}>
                <img src={c.src} alt={c.alt} className="h-full w-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.background = `hsl(${30 + i * 8},35%,14%)` }} />
              </Link>
            ))}
          </div>
          <p className="mt-10 text-center text-sm" style={{ color: 'var(--nc-text2)' }}>
            More worlds opening soon.{' '}
            <Link href="/library" className="font-semibold transition hover:opacity-80" style={G}>Join the waitlist →</Link>
          </p>
        </div>
      </section>

      {/* ── Use cases ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t py-20" style={{ background: 'var(--nc-bg2)', borderColor: 'var(--nc-border)' }}>
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest" style={G}>Use cases</p>
          <h2 className="font-display mb-16 text-center text-4xl font-semibold" style={{ color: 'var(--nc-text)' }}>
            What readers use it for
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Catch up instantly', desc: 'Missed 200 chapters? Ask for a summary of everything that happened. Be back in the story in minutes.' },
              { icon: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35', title: 'Find hidden lore', desc: 'Remember reading about a secret technique? NovelCodex finds it across thousands of chapters instantly.' },
              { icon: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Settle debates', desc: "Who's stronger — Yun Che or Meng Hao? Get a chapter-referenced answer with actual power levels." },
              { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', title: 'Compare across novels', desc: 'How does ISSTH’s cultivation system compare to Reverend Insanity? Ask and get a detailed breakdown.' },
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'Track every character', desc: 'Forget who that minor sect elder was? Ask for a full breakdown of any character and their fate.' },
              { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', title: 'Spoiler control', desc: 'Set a chapter ceiling with the spoiler shield. Find out if a character dies — only up to where you’ve read.' },
            ].map(uc => (
              <div key={uc.title} className="nc-card nc-card-hover rounded-[var(--nc-r-xl)] p-6">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[var(--nc-r-md)] border"
                  style={{ background: 'var(--nc-amber-soft)', borderColor: 'var(--nc-amber-line)', color: 'var(--nc-amber)' }}>
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
                    <path d={uc.icon} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <h3 className="mb-2 text-base font-bold" style={{ color: 'var(--nc-text)' }}>{uc.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--nc-text2)' }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest" style={G}>Reviews</p>
          <h2 className="font-display mb-2 text-center text-4xl font-semibold" style={{ color: 'var(--nc-text)' }}>
            What readers are saying
          </h2>
          <p className="mb-12 text-center text-sm" style={{ color: 'var(--nc-text2)' }}>
            Thousands of readers, one verdict.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map(r => (
              <div key={r.name} className="nc-card flex flex-col rounded-[var(--nc-r-xl)] p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <span key={i} className="text-sm" style={G}>★</span>
                  ))}
                </div>
                <p className="mb-5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>{r.text}</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--nc-text2)' }}>@{r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden border-y py-24"
        style={{ borderColor: 'var(--nc-amber-line)',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.05) 50%, rgba(217,119,6,0.08) 100%)' }}>
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <div>
            <h2 className="font-display mb-3 text-4xl font-semibold" style={G}>
              Start for free today.
            </h2>
            <p className="text-base" style={{ color: 'var(--nc-text2)' }}>
              50 free tokens on signup. No credit card. No commitment.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-4 sm:flex-row">
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
                  className="rounded-full border px-8 py-3.5 text-center text-sm font-semibold transition hover:border-[var(--nc-amber-line)]"
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
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest" style={G}>FAQ</p>
        <h2 className="font-display mb-16 text-center text-4xl font-semibold" style={{ color: 'var(--nc-text)' }}>
          Frequently asked questions
        </h2>
        <FaqBlock />
      </section>

      <Footer />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
