'use client'

import { useEffect, useState } from 'react'
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
const onCoverErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  ;(e.target as HTMLImageElement).style.background = '#181c27'
}

const REVIEWS = [
  { name: 'sanriih0e',        text: 'I stopped reading to focus on studying and was 500 chapters behind and completely forgot the entire volume I was in so I asked for a recap and was back up to speed in 3mins' },
  { name: 'CosmicStorm86',    text: "I like using this to make sure I don't waste time with stories that end up being sh*t lol" },
  { name: 'nightpine55',      text: 'Whenever I read and forget a character I use this to remind myself of everything' },
  { name: 'SparklyJellyfish', text: 'I use this to research powerscaling in different novels for my tiktoks' },
  { name: 'lilyspace',        text: 'I like da multichat cuz I just add every novel, describe what I\'m looking for and it gives me banger picks' },
  { name: 'SillyKitten22',    text: 'Been reading cultivation novels since 2014. This is genuinely the first tool that makes tracking realms, factions and power rankings manageable in novels with 2000+ chapters.' },
]

const FAQ = [
  { category: 'General', items: [
    { q: 'What is NovelCodex?', a: 'NovelCodex is an AI-powered reading companion for xianxia, cultivation, and wuxia web novels. Ask any question about a story and get accurate, source-grounded answers drawn directly from the indexed chapters.' },
    { q: 'Who is NovelCodex for?', a: 'Anyone who reads web novels — whether you want to catch up after a long break, settle a debate about cultivation realms, or find out if a character survives without reading 800 chapters.' },
    { q: 'Is NovelCodex free to use?', a: 'Yes. You get 50 free tokens on signup with no credit card required (40 instantly, plus 10 more when you add your name and age). Every featured novel is ready to chat with for free.' },
    { q: 'How do I get started?', a: 'Create a free account, browse the featured library, pick any novel, and start asking questions — every featured novel is ready instantly.' },
  ]},
  { category: 'How It Works', items: [
    { q: 'How does the AI chat work?', a: 'We use retrieval-augmented generation (RAG) to index every chapter of a novel into a vector database. When you ask a question, we search those chapters and synthesize an accurate answer from the actual text — no hallucination.' },
    { q: 'Can it answer spoiler questions?', a: 'Yes — and you control them. Ask anything including "does X die?", or set a chapter ceiling with the spoiler shield so answers never reveal beyond where you\'ve read.' },
    { q: 'How accurate are the answers?', a: 'Very accurate for factual questions about plot, characters, and cultivation systems. Every answer is sourced from the indexed chapter text.' },
    { q: 'What is multi-novel chat?', a: 'Multi-novel chat lets you ask questions that span multiple novels at once — compare cultivation systems, debate which protagonist would win, or find similar characters across stories.' },
  ]},
  { category: 'Tokens & Billing', items: [
    { q: 'What are tokens?', a: 'Tokens are the currency for AI chat. Each message costs 10 tokens. Every featured novel is ready to chat with for free — you only spend tokens when you actually chat.' },
    { q: 'Do tokens expire?', a: 'Never. Tokens you purchase are yours indefinitely — no subscription required, no monthly reset.' },
    { q: 'What payment options are available?', a: 'New users receive 50 free tokens on signup. Buy more any time from the shop with a one-time purchase, or subscribe for a monthly allowance at a lower per-token rate.' },
    { q: 'What is the subscription?', a: 'Subscriptions offer a monthly token allowance at a lower per-token cost than one-time purchases — ideal for readers who use NovelCodex daily.' },
  ]},
  { category: 'Novels & Content', items: [
    { q: 'Which novels are available?', a: 'We\'re in curated preview — eight hand-picked, fully-indexed cultivation epics including Reverend Insanity, Against the Gods, Shadow Slave, Supreme Magus, I Shall Seal the Heavens, Renegade Immortal, A Will Eternal, and Warlock of the Magus World.' },
    { q: 'Can I request a novel?', a: 'Yes. Use the feedback widget on any page or join the waitlist to request a specific title. Highly requested novels are prioritized as we expand.' },
    { q: 'How often are new novels added?', a: 'We\'re expanding the curated library steadily. Join the waitlist and we\'ll email you the moment new titles go live.' },
    { q: 'Who owns the indexed content?', a: 'All original novel content remains the property of its respective authors and publishers. NovelCodex indexes chapter text solely for AI-powered search and conversation, and does not redistribute raw text to end users.' },
  ]},
]

function FaqBlock() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="space-y-10">
      {FAQ.map(section => (
        <div key={section.category}>
          <p className="bp-eyebrow mb-4">{section.category}</p>
          <div>
            {section.items.map(item => (
              <div key={item.q} style={{ borderTop: '1px solid var(--bp-border)' }}>
                <button type="button" onClick={() => setOpen(open === item.q ? null : item.q)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left">
                  <span className="text-[15px] font-medium" style={{ color: 'var(--bp-glacier)' }}>{item.q}</span>
                  <svg viewBox="0 0 10 6" fill="none" className="h-3 w-3 shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--bp-fog)', transform: open === item.q ? 'rotate(180deg)' : 'none' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="grid transition-all duration-200 ease-out" style={{ gridTemplateRows: open === item.q ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden"><div className="pb-4 pr-8 text-[15px] leading-relaxed" style={{ color: 'var(--bp-pebble)' }}>{item.a}</div></div>
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--bp-border)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Product preview — the chat widget, rendered in CSS (the product, shown) ─────
function ChatPreview() {
  return (
    <div className="bp-frame mx-auto w-full max-w-md rounded-[var(--nc-r-lg)]">
      <div className="bp-plate overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--bp-border)' }}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--bp-accent)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--bp-glacier)' }}>Against the Gods</span>
          </div>
          <span className="bp-eyebrow" style={{ fontSize: '0.65rem' }}>2,187 ch</span>
        </div>
        <div className="space-y-3 px-5 py-5">
          <div className="flex justify-end">
            <div className="max-w-[82%] rounded-lg px-3.5 py-2.5 text-[13px]" style={{ background: 'var(--bp-plate2)', color: 'var(--bp-moon)', boxShadow: 'inset 0 0 0 1px var(--bp-hair)' }}>
              Who is Yun Che and what&apos;s his cultivation realm?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-lg px-3.5 py-2.5" style={{ background: 'rgba(186,215,247,0.04)', boxShadow: 'inset 0 0 0 1px var(--bp-hair)' }}>
              <p className="mb-2 text-[13px] leading-relaxed" style={{ color: 'var(--bp-pebble)' }}>
                Yun Che is the protagonist — a young man reborn with the Evil God&apos;s bloodline, carrying the Sky Poison Pearl...
              </p>
              <div className="mb-1 h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(186,215,247,0.12)' }} />
              <div className="h-1.5 w-1/2 rounded-full" style={{ background: 'rgba(186,215,247,0.10)' }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--bp-border)' }}>
          <div className="flex h-9 flex-1 items-center rounded-[4px] px-3" style={{ boxShadow: 'inset 0 0 0 1px var(--bp-hair)' }}>
            <span className="text-[12px]" style={{ color: 'var(--bp-fog)' }}>Ask anything about the story…</span>
          </div>
          <button className="flex h-9 w-10 items-center justify-center rounded-[4px]" style={{ background: 'var(--bp-accent)' }}>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" style={{ color: 'var(--bp-accent-ink)' }}>
              <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section shell — eyebrow + heading + optional kicker, centered ──────────────
function SectionHead({ eyebrow, title, kicker }: { eyebrow: string; title: string; kicker?: string }) {
  return (
    <div className="mx-auto mb-14 max-w-2xl text-center">
      <p className="bp-eyebrow mb-4">{eyebrow}</p>
      <h2 className="font-display text-3xl font-medium leading-tight sm:text-[2.5rem]" style={{ color: 'var(--bp-glacier)' }}>{title}</h2>
      {kicker && <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--bp-pebble)' }}>{kicker}</p>}
    </div>
  )
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
    if (hash.includes('access_token=')) window.location.replace('/auth/callback' + hash)
  }, [])
  const dismissWelcome = () => { localStorage.setItem('nb_welcomed', '1'); setShowWelcome(false) }

  const FEATURES = [
    { icon: 'M3 5h18M3 12h18M3 19h12', label: 'Catch up', desc: 'Recap hundreds of chapters in minutes.' },
    { icon: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35', label: 'Find lore', desc: 'Surface any technique, faction, or detail.' },
    { icon: 'M12 3l9 4.5-9 4.5-9-4.5L12 3zM3 12l9 4.5 9-4.5', label: 'Compare', desc: 'Span multiple novels in one question.' },
    { icon: 'M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z', label: 'Settle debates', desc: 'Chapter-referenced power scaling.' },
    { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21a7 7 0 0118 0', label: 'Track characters', desc: 'Full breakdowns and fates on demand.' },
    { icon: 'M12 9v4m0 4h.01M10.3 4l-7 12a2 2 0 001.7 3h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z', label: 'Spoiler shield', desc: 'Cap answers to where you\'ve read.' },
  ]

  return (
    <div className="bp-root relative flex min-h-screen flex-col overflow-x-hidden pb-16 sm:pb-0">
      <div className="bp-atmos" aria-hidden />

      {/* ── Welcome popup ──────────────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 nc-fade-in"
          style={{ background: 'rgba(4,5,12,0.84)', backdropFilter: 'blur(8px)' }} onClick={dismissWelcome}>
          <div className="bp-plate relative w-full max-w-md p-7 nc-fade-up" onClick={e => e.stopPropagation()}>
            <button onClick={dismissWelcome} className="absolute right-4 top-4 text-lg leading-none transition hover:opacity-70" style={{ color: 'var(--bp-fog)' }}>×</button>
            <p className="bp-eyebrow mb-2">Introducing</p>
            <h2 className="font-display mb-2 text-2xl font-medium" style={{ color: 'var(--bp-glacier)' }}>NovelCodex</h2>
            <p className="mb-5 text-[15px] leading-relaxed" style={{ color: 'var(--bp-pebble)' }}>
              Step into eight hand-picked cultivation epics. Ask anything — characters, systems, plot, lore, spoilers — and get instant, source-grounded answers.
            </p>
            <div className="mb-6 space-y-3">
              {([['Browse', 'Eight fully-indexed featured novels'], ['Pick', 'Choose any novel — ready instantly'], ['Ask', 'Chat with the book — characters, lore, anything']] as [string, string][]).map(([t, d], idx) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="bp-tile" style={{ width: 22, height: 22, borderRadius: 6 }}><span className="text-[11px] font-semibold" style={{ color: 'var(--bp-frost)' }}>{idx + 1}</span></span>
                  <div><span className="text-sm font-semibold" style={{ color: 'var(--bp-glacier)' }}>{t}</span><span className="text-sm" style={{ color: 'var(--bp-pebble)' }}> — {d}</span></div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/library" onClick={dismissWelcome} className="bp-ghost flex-1">Browse Library</Link>
              <button onClick={() => { dismissWelcome(); if (!user) setShowAuth(true) }} className="bp-cta flex-1">Get Started</button>
            </div>
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--bp-fog)' }}>50 free tokens · No credit card required</p>
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-5">
        <span className="font-display text-lg font-semibold" style={{ color: 'var(--bp-glacier)' }}>NovelCodex</span>
        <nav className="flex items-center gap-1">
          <Link href="/library" className="bp-pill hidden sm:inline-flex">Library</Link>
          <Link href="/characters" className="bp-pill hidden sm:inline-flex">Characters</Link>
          {user
            ? <Link href="/library" className="bp-cta ml-1">Go to Library</Link>
            : <button onClick={() => setShowAuth(true)} className="bp-cta ml-1">Get started</button>}
        </nav>
      </header>

      {/* ── Hero — the arrival ─────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 pt-16 pb-24 text-center sm:pt-24">
        <div className="mb-6 flex items-center gap-3" style={{ color: 'var(--bp-fog)' }}>
          <span className="h-px w-8" style={{ background: 'var(--bp-border)' }} />
          <span className="bp-eyebrow">Curated preview · 8 worlds</span>
          <span className="h-px w-8" style={{ background: 'var(--bp-border)' }} />
        </div>
        <h1 className="font-display font-medium leading-[1.04] tracking-tight" style={{ fontSize: 'clamp(2.75rem, 6vw, 4.5rem)' }}>
          <span style={{ color: 'var(--bp-glacier)' }}>Every answer,</span><br />
          <span className="bp-grad-text">inside the book.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed" style={{ color: 'var(--bp-pebble)' }}>
          An AI companion that has read every chapter of eight cultivation epics — so you can step back
          into any story exactly where you left off.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {user
            ? <Link href="/library" className="bp-cta">Go to Library</Link>
            : <><button onClick={() => setShowAuth(true)} className="bp-cta">Get started free</button>
               <Link href="/library" className="bp-ghost">Browse the library</Link></>}
        </div>
        <p className="mt-4 bp-eyebrow" style={{ fontSize: '0.72rem' }}>50 free tokens · No credit card</p>

        {/* Product preview */}
        <div className="mt-16 w-full nc-fade-up"><ChatPreview /></div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6">
        <div className="bp-plate grid grid-cols-2 sm:grid-cols-4">
          {[['8', 'Featured worlds'], ['18,000+', 'Chapters indexed'], ['100%', 'Source-grounded'], ['24/7', 'Always current']].map(([v, l], i) => (
            <div key={l} className="px-6 py-7 text-center" style={i > 0 ? { borderLeft: '1px solid var(--bp-border)' } : undefined}>
              <p className="font-display text-3xl font-medium" style={{ color: 'var(--bp-glacier)' }}>{v}</p>
              <p className="bp-eyebrow mt-1.5" style={{ fontSize: '0.7rem' }}>{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pt-28">
        <SectionHead eyebrow="How it works" title="One question away from everything"
          kicker="Every featured novel is fully indexed, chapter by chapter. Ask in plain language; get a source-grounded answer instantly." />
        <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-6 overflow-hidden" style={{ background: 'var(--bp-border)', borderRadius: 'var(--nc-r-lg)' }}>
          {FEATURES.map(f => (
            <div key={f.label} className="flex flex-col items-center gap-3 px-4 py-7 text-center" style={{ background: 'var(--bp-canvas)' }}>
              <span className="bp-tile">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5"><path d={f.icon} strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--bp-glacier)' }}>{f.label}</p>
              <p className="text-[12px] leading-snug" style={{ color: 'var(--bp-fog)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cover wall ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pt-28">
        <SectionHead eyebrow="The library" title="Eight worlds. Every chapter."
          kicker="Hand-picked, fully indexed, and ready the instant you open them." />
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
          {COVERS.map(c => (
            <Link key={c.slug} href={`/novel/${c.slug}`} className="bp-cover block" style={{ aspectRatio: '3/4' }}>
              <img src={c.src} alt={c.alt} className="h-full w-full object-cover" onError={onCoverErr} />
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center text-[14px]" style={{ color: 'var(--bp-fog)' }}>
          More worlds opening soon. <Link href="/library" className="font-medium" style={{ color: 'var(--bp-frost)' }}>Join the waitlist →</Link>
        </p>
      </section>

      {/* ── Use cases ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pt-28">
        <SectionHead eyebrow="Use cases" title="What readers use it for" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Catch up instantly', 'Missed 200 chapters? Ask for a summary of everything that happened and be back in minutes.'],
            ['Find hidden lore', 'Remember a secret technique? NovelCodex surfaces it across thousands of chapters instantly.'],
            ['Settle debates', "Who's stronger — Yun Che or Meng Hao? Get a chapter-referenced answer with real power levels."],
            ['Compare across novels', 'How does ISSTH’s cultivation system compare to Reverend Insanity? Get a detailed breakdown.'],
            ['Track every character', 'Forget who that minor sect elder was? Ask for a full breakdown of any character and their fate.'],
            ['Spoiler control', 'Set a chapter ceiling with the spoiler shield. Learn only up to where you’ve read.'],
          ].map(([t, d]) => (
            <div key={t} className="bp-plate bp-plate-hover p-6">
              <h3 className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--bp-glacier)' }}>{t}</h3>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--bp-pebble)' }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pt-28">
        <SectionHead eyebrow="Reviews" title="What readers are saying" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map(r => (
            <div key={r.name} className="bp-plate flex flex-col p-6">
              <div className="mb-3 flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <span key={i} className="text-sm" style={{ color: 'var(--bp-accent)' }}>★</span>)}</div>
              <p className="mb-5 flex-1 text-[14px] leading-relaxed" style={{ color: 'var(--bp-moon)' }}>{r.text}</p>
              <p className="bp-eyebrow" style={{ fontSize: '0.7rem' }}>@{r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pt-28">
        <div className="bp-frame rounded-[var(--nc-r-lg)]">
          <div className="bp-plate px-8 py-16 text-center">
            <p className="bp-eyebrow mb-4">Get started</p>
            <h2 className="font-display mx-auto max-w-xl text-3xl font-medium leading-tight sm:text-[2.5rem]" style={{ color: 'var(--bp-glacier)' }}>
              Step into the story.
            </h2>
            <p className="mx-auto mb-8 mt-4 max-w-md text-[15px]" style={{ color: 'var(--bp-pebble)' }}>
              50 free tokens on signup. No credit card. No commitment. Eight worlds waiting.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user
                ? <Link href="/library" className="bp-cta">Go to Library</Link>
                : <><button onClick={() => setShowAuth(true)} className="bp-cta">Create free account</button>
                   <Link href="/library" className="bp-ghost">Browse first</Link></>}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28">
        <SectionHead eyebrow="FAQ" title="Frequently asked questions" />
        <FaqBlock />
      </section>

      <div className="relative z-10 mt-28"><Footer /></div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
