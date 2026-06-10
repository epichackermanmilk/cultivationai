'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AuthModal   from '@/components/AuthModal'
import Footer      from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

// ── Featured novels — the 8 live during the curated preview ────────────────────
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

const onCoverErr = (e: React.SyntheticEvent<HTMLImageElement>, i: number) => {
  ;(e.target as HTMLImageElement).style.background = `linear-gradient(160deg, hsl(${265 + i * 10},60%,22%), hsl(${320 + i * 6},55%,16%))`
}

// ── Reviews ───────────────────────────────────────────────────────────────────
const REVIEWS = [
  { name: 'sanriih0e',        stars: 5, text: 'I stopped reading to focus on studying and was 500 chapters behind and completely forgot the entire volume I was in so I asked for a recap and was back up to speed in 3mins' },
  { name: 'CosmicStorm86',    stars: 5, text: "I like using this to make sure I don't waste time with stories that end up being sh*t lol" },
  { name: 'nightpine55',      stars: 5, text: 'Whenever I read and forget a character I use this to remind myself of everything' },
  { name: 'SparklyJellyfish', stars: 5, text: 'I use this to research powerscaling in different novels for my tiktoks' },
  { name: 'lilyspace',        stars: 5, text: 'I like da multichat cuz I just add every novel, describe what I\'m looking for and it gives me banger picks' },
  { name: 'SillyKitten22',    stars: 5, text: 'Been reading cultivation novels since 2014. This is genuinely the first tool that makes tracking realms, factions and power rankings manageable in novels with 2000+ chapters.' },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    category: 'General',
    items: [
      { q: 'What is NovelCodex?', a: 'NovelCodex is an AI-powered reading companion for xianxia, cultivation, and wuxia web novels. Ask any question about a story and get accurate, source-grounded answers drawn directly from the indexed chapters.' },
      { q: 'Who is NovelCodex for?', a: 'Anyone who reads web novels — whether you want to catch up after a long break, settle a debate about cultivation realms, or find out if a character survives without reading 800 chapters.' },
      { q: 'Is NovelCodex free to use?', a: 'Yes. You get 50 free tokens on signup with no credit card required (40 instantly, plus 10 more when you add your name and age). Every featured novel is ready to chat with for free — you only spend tokens when you chat.' },
      { q: 'How do I get started?', a: 'Create a free account, browse the featured library, pick any novel, and start asking questions — every featured novel is ready instantly.' },
    ],
  },
  {
    category: 'How It Works',
    items: [
      { q: 'How does the AI chat work?', a: 'We use retrieval-augmented generation (RAG) to index every chapter of a novel into a vector database. When you ask a question, we search those chapters and synthesize an accurate answer from the actual text — no hallucination.' },
      { q: 'Can it answer spoiler questions?', a: 'Yes — and you control them. Ask anything including "does X die?", or set a chapter ceiling with the spoiler shield so answers never reveal beyond where you\'ve read.' },
      { q: 'How accurate are the answers?', a: 'Very accurate for factual questions about plot, characters, and cultivation systems. Every answer is sourced from the indexed chapter text.' },
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
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] sw-grad-cool">{section.category}</p>
          <div>
            {section.items.map(item => (
              <div key={item.q} className="border-t" style={{ borderColor: 'rgba(124,58,237,0.22)' }}>
                <button
                  type="button"
                  onClick={() => setOpen(open === item.q ? null : item.q)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--sw-ink)' }}>{item.q}</span>
                  <svg viewBox="0 0 10 6" fill="none"
                    className="h-3 w-3 shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--sw-cyan)', transform: open === item.q ? 'rotate(180deg)' : 'none' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="grid transition-all duration-200 ease-out" style={{ gridTemplateRows: open === item.q ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <div className="pb-4 pr-8 text-sm leading-relaxed" style={{ color: 'var(--sw-ink2)' }}>{item.a}</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t" style={{ borderColor: 'rgba(124,58,237,0.22)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Reskinned product mockups ──────────────────────────────────────────────────
function LibraryMockup() {
  return (
    <div className="sw-panel mx-auto w-full max-w-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'rgba(124,58,237,0.25)' }}>
        <span className="font-display text-sm font-bold sw-grad-text">NovelCodex</span>
        <div className="mx-2 h-5 flex-1 rounded-md" style={{ background: 'rgba(124,58,237,0.18)' }} />
        <div className="h-5 w-8 rounded-md" style={{ background: 'rgba(34,211,238,0.18)' }} />
      </div>
      <div className="px-4 py-3">
        <div className="flex h-7 items-center gap-2 rounded-lg border px-3" style={{ borderColor: 'rgba(34,211,238,0.25)', background: 'rgba(6,5,13,0.6)' }}>
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 16 16" style={{ color: 'var(--sw-cyan)' }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div className="h-2 w-20 rounded-full" style={{ background: 'rgba(166,160,201,0.4)' }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {['Cultivation', 'Xianxia', 'Wuxia'].map(g => (
          <span key={g} className="rounded-full border px-2 py-0.5 text-xs" style={{ color: 'var(--sw-pink)', background: 'rgba(255,93,177,0.08)', borderColor: 'rgba(255,93,177,0.3)' }}>{g}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {COVERS.slice(0, 6).map((c, i) => (
          <div key={i} className="overflow-hidden rounded-lg" style={{ aspectRatio: '3/4' }}>
            <img src={c.src} alt="" className="h-full w-full object-cover" onError={e => onCoverErr(e, i)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatMockup() {
  return (
    <div className="sw-panel mx-auto w-full max-w-sm overflow-hidden">
      <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(124,58,237,0.25)' }}>
        <p className="text-xs font-bold" style={{ color: 'var(--sw-ink)' }}>AI Chat — Against the Gods</p>
        <p className="text-xs" style={{ color: 'var(--sw-ink2)' }}>2,187 chapters indexed</p>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-sm border px-3 py-2" style={{ background: 'rgba(255,93,177,0.12)', borderColor: 'rgba(255,93,177,0.35)' }}>
            <p className="text-xs" style={{ color: 'var(--sw-ink)' }}>Who is Yun Che and what&apos;s his cultivation realm?</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border px-3 py-2" style={{ background: 'rgba(34,211,238,0.07)', borderColor: 'rgba(34,211,238,0.28)' }}>
            <p className="mb-1.5 text-xs leading-relaxed" style={{ color: 'var(--sw-ink2)' }}>
              Yun Che is the protagonist — a young man reborn with the Evil God&apos;s bloodline...
            </p>
            <div className="mb-1 h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(34,211,238,0.25)' }} />
            <div className="h-1.5 w-1/2 rounded-full" style={{ background: 'rgba(34,211,238,0.18)' }} />
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-t px-3 py-3" style={{ borderColor: 'rgba(124,58,237,0.25)' }}>
        <div className="flex h-7 flex-1 items-center rounded-lg border px-3" style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(6,5,13,0.6)' }}>
          <div className="h-1.5 w-24 rounded-full" style={{ background: 'rgba(166,160,201,0.4)' }} />
        </div>
        <div className="flex h-7 w-12 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(108deg, var(--sw-pink), var(--sw-violet))', boxShadow: '0 0 16px rgba(255,93,177,0.4)' }}>
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-white">
            <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth()
  const [showAuth,    setShowAuth]    = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const sunRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('nb_welcomed')) setShowWelcome(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash.includes('access_token=')) window.location.replace('/auth/callback' + hash)
  }, [])

  // Subtle parallax — the sun drifts slower than the scroll, suggesting depth.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        if (sunRef.current) sunRef.current.style.transform = `translateX(-50%) translateY(${y * 0.18}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const dismissWelcome = () => { localStorage.setItem('nb_welcomed', '1'); setShowWelcome(false) }

  return (
    <div className="sw-root relative flex min-h-screen flex-col overflow-x-hidden pb-16 sm:pb-0">
      {/* Continuous-world atmosphere — stars + scanlines, fixed behind everything */}
      <div className="sw-atmos" aria-hidden />

      {/* ── Welcome popup ──────────────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 nc-fade-in"
          style={{ background: 'rgba(4,3,10,0.82)', backdropFilter: 'blur(8px)' }}
          onClick={dismissWelcome}>
          <div className="sw-panel relative w-full max-w-md p-7 nc-fade-up" onClick={e => e.stopPropagation()}>
            <button onClick={dismissWelcome} className="absolute right-4 top-4 text-lg leading-none transition hover:opacity-70" style={{ color: 'var(--sw-ink2)' }}>×</button>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] sw-grad-cool">Welcome</p>
            <h2 className="font-display mb-2 text-2xl font-bold sw-grad-text">NovelCodex</h2>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--sw-ink2)' }}>
              Step into eight hand-picked cultivation epics. Ask anything — characters, systems, plot, lore,
              spoilers — and get instant AI answers from the actual text.
            </p>
            <div className="mb-6 space-y-3">
              {([['Browse', 'Eight fully-indexed featured novels'], ['Pick', 'Choose any novel — ready instantly'], ['Ask', 'Chat with the book — characters, lore, anything']] as [string, string][]).map(([t, d], idx) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.4)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--sw-cyan)' }}>{idx + 1}</span>
                  </span>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--sw-ink)' }}>{t}</span>
                    <span className="text-sm" style={{ color: 'var(--sw-ink2)' }}> — {d}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/library" onClick={dismissWelcome} className="sw-btn-ghost flex-1">Browse Library</Link>
              <button onClick={() => { dismissWelcome(); if (!user) setShowAuth(true) }} className="sw-btn flex-1">Get Started</button>
            </div>
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--sw-ink2)' }}>50 free tokens · No credit card required</p>
          </div>
        </div>
      )}

      {/* ── HERO — the arrival ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* Sun + grid composition */}
        <div ref={sunRef} className="pointer-events-none absolute left-1/2 -z-[1]"
          style={{ top: '34%', width: 'min(560px, 86vw)', height: 'min(560px, 86vw)', transform: 'translateX(-50%)' }}>
          <div className="sw-sun h-full w-full" style={{ animation: 'sw-pulse 5s ease-in-out infinite' }} />
        </div>
        <div className="sw-grid" aria-hidden />

        <div className="relative z-10 mx-auto max-w-3xl nc-fade-up">
          <span className="sw-chip mb-7">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--sw-cyan)', boxShadow: '0 0 8px var(--sw-cyan)' }} />
            Curated preview · 8 featured worlds
          </span>
          <h1 className="font-display font-bold leading-[1.0] tracking-tight sw-glow"
            style={{ fontSize: 'clamp(3rem, 7vw, 6rem)' }}>
            <span className="sw-grad-text">Every answer.</span>
            <br />
            <span style={{ color: 'var(--sw-ink)' }}>Inside the book.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--sw-ink2)' }}>
            A companion from a brighter tomorrow. NovelCodex has read every chapter of eight cultivation
            epics — so you can step back into any story exactly where you left off.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link href="/library" className="sw-btn">Go to Library</Link>
            ) : (
              <>
                <button onClick={() => setShowAuth(true)} className="sw-btn">Get Started Free</button>
                <Link href="/library" className="sw-btn-ghost">Browse the library</Link>
              </>
            )}
          </div>
          <p className="mt-4 text-xs" style={{ color: 'var(--sw-ink2)' }}>50 free tokens on signup · No credit card required</p>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: 'sw-float 2.6s ease-in-out infinite' }}>
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" style={{ color: 'var(--sw-cyan)' }}>
            <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ── Stats marquee ──────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-px overflow-hidden sm:grid-cols-4 sw-panel">
          {[
            { val: '8',       label: 'Featured worlds'  },
            { val: '18,000+', label: 'Chapters indexed' },
            { val: '100%',    label: 'Source-grounded'  },
            { val: '24/7',    label: 'Always current'   },
          ].map(s => (
            <div key={s.label} className="px-4 py-6 text-center">
              <p className="font-display text-3xl font-bold sw-grad-text">{s.val}</p>
              <p className="mt-1 text-xs tracking-wide" style={{ color: 'var(--sw-ink2)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works — deepening immersion ─────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <hr className="sw-divider mb-16" />
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] sw-grad-cool">How it works</p>
        <h2 className="font-display mb-16 text-center text-4xl font-semibold leading-tight sw-glow" style={{ color: 'var(--sw-ink)' }}>
          Three steps to know everything<br />about any world
        </h2>

        <div className="mb-20 flex flex-col items-center gap-12 md:flex-row">
          <div className="order-2 flex-1 md:order-1">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--sw-cyan)' }}>Browse the Library</p>
            <h3 className="font-display mb-5 text-3xl font-semibold" style={{ color: 'var(--sw-ink)' }}>Eight hand-picked cultivation epics</h3>
            <p className="mb-6 text-lg leading-relaxed" style={{ color: 'var(--sw-ink2)' }}>
              From Reverend Insanity to Against the Gods — every featured novel is fully indexed, chapter by chapter, and ready the instant you open it.
            </p>
            <Link href="/library" className="inline-flex items-center gap-2 text-sm font-semibold sw-grad-cool">Browse the library →</Link>
          </div>
          <div className="order-1 w-full flex-1 md:order-2"><LibraryMockup /></div>
        </div>

        <div className="mb-20 flex flex-col items-center gap-12 md:flex-row">
          <div className="w-full flex-1"><ChatMockup /></div>
          <div className="flex-1">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--sw-pink)' }}>Ask Anything</p>
            <h3 className="font-display mb-5 text-3xl font-semibold" style={{ color: 'var(--sw-ink)' }}>Chat with the novel like an old friend</h3>
            <p className="mb-6 text-lg leading-relaxed" style={{ color: 'var(--sw-ink2)' }}>
              Characters, plot twists, cultivation ranks, hidden lore, spoilers — or compare across multiple novels at once. Instant, source-grounded answers, every time.
            </p>
            <Link href="/chat" className="inline-flex items-center gap-2 text-sm font-semibold sw-grad-cool">Try multi-novel chat →</Link>
          </div>
        </div>
      </section>

      {/* ── Cover wall ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <hr className="sw-divider mb-16" />
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] sw-grad-cool">The Library</p>
          <h2 className="font-display mb-12 text-center text-4xl font-semibold sw-glow" style={{ color: 'var(--sw-ink)' }}>
            Eight worlds. Every chapter. One AI.
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:gap-5">
            {COVERS.map((c, i) => (
              <Link key={i} href={`/novel/${c.slug}`} className="sw-cover block" style={{ aspectRatio: '3/4' }}>
                <img src={c.src} alt={c.alt} className="h-full w-full object-cover" onError={e => onCoverErr(e, i)} />
              </Link>
            ))}
          </div>
          <p className="mt-10 text-center text-sm" style={{ color: 'var(--sw-ink2)' }}>
            More worlds opening soon. <Link href="/library" className="font-semibold sw-grad-cool">Join the waitlist →</Link>
          </p>
        </div>
      </section>

      {/* ── Use cases ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <hr className="sw-divider mb-16" />
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] sw-grad-cool">Use cases</p>
          <h2 className="font-display mb-16 text-center text-4xl font-semibold sw-glow" style={{ color: 'var(--sw-ink)' }}>What readers use it for</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Catch up instantly', desc: 'Missed 200 chapters? Ask for a summary of everything that happened. Back in the story in minutes.' },
              { icon: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35', title: 'Find hidden lore', desc: 'Remember a secret technique? NovelCodex finds it across thousands of chapters instantly.' },
              { icon: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Settle debates', desc: "Who's stronger — Yun Che or Meng Hao? Get a chapter-referenced answer with actual power levels." },
              { icon: 'M12 6.25v13m0-13C10.8 5.5 9.2 5 7.5 5S4.2 5.5 3 6.25v13C4.2 18.5 5.8 18 7.5 18s3.3.5 4.5 1.25m0-13C13.2 5.5 14.8 5 16.5 5s3.3.5 4.5 1.25v13C19.8 18.5 18.2 18 16.5 18s-3.3.5-4.5 1.25', title: 'Compare across novels', desc: 'How does ISSTH’s cultivation system compare to Reverend Insanity? Get a detailed breakdown.' },
              { icon: 'M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'Track every character', desc: 'Forget who that minor sect elder was? Ask for a full breakdown of any character and their fate.' },
              { icon: 'M12 9v2m0 4h.01m-6.94 4h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z', title: 'Spoiler control', desc: 'Set a chapter ceiling with the spoiler shield. Find out if a character dies — only up to where you’ve read.' },
            ].map(uc => (
              <div key={uc.title} className="sw-panel sw-panel-hover p-6">
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border" style={{ background: 'rgba(34,211,238,0.08)', borderColor: 'rgba(34,211,238,0.35)', color: 'var(--sw-cyan)', boxShadow: '0 0 18px rgba(34,211,238,0.18)' }}>
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6"><path d={uc.icon} strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <h3 className="mb-2 text-base font-bold" style={{ color: 'var(--sw-ink)' }}>{uc.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--sw-ink2)' }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <hr className="sw-divider mb-16" />
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] sw-grad-cool">Reviews</p>
          <h2 className="font-display mb-2 text-center text-4xl font-semibold sw-glow" style={{ color: 'var(--sw-ink)' }}>What readers are saying</h2>
          <p className="mb-12 text-center text-sm" style={{ color: 'var(--sw-ink2)' }}>Thousands of readers, one verdict.</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map(r => (
              <div key={r.name} className="sw-panel sw-panel-hover flex flex-col p-6">
                <div className="mb-3 flex gap-0.5">{Array.from({ length: r.stars }).map((_, i) => <span key={i} className="text-sm" style={{ color: 'var(--sw-gold)' }}>★</span>)}</div>
                <p className="mb-5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--sw-ink)' }}>{r.text}</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--sw-cyan)' }}>@{r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — the convergence ──────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[var(--nc-r-2xl)] p-px"
          style={{ background: 'linear-gradient(108deg, rgba(255,93,177,0.6), rgba(34,211,238,0.6))', boxShadow: '0 0 60px rgba(124,58,237,0.35)' }}>
          <div className="rounded-[calc(var(--nc-r-2xl)-1px)] px-8 py-14 text-center"
            style={{ background: 'linear-gradient(180deg, rgba(12,9,28,0.92), rgba(8,6,20,0.96))' }}>
            <h2 className="font-display mb-3 text-4xl font-bold sw-grad-text sw-glow">Step into tomorrow.</h2>
            <p className="mx-auto mb-8 max-w-md text-base" style={{ color: 'var(--sw-ink2)' }}>
              50 free tokens on signup. No credit card. No commitment. Eight worlds waiting.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {user ? (
                <Link href="/library" className="sw-btn">Go to Library</Link>
              ) : (
                <>
                  <button onClick={() => setShowAuth(true)} className="sw-btn">Create Free Account</button>
                  <Link href="/library" className="sw-btn-ghost">Browse first</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <hr className="sw-divider mb-16" />
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] sw-grad-cool">FAQ</p>
        <h2 className="font-display mb-16 text-center text-4xl font-semibold sw-glow" style={{ color: 'var(--sw-ink)' }}>Frequently asked questions</h2>
        <FaqBlock />
      </section>

      <div className="relative z-10"><Footer /></div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
