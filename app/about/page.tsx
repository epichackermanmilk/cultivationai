import Link from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'About — NovelCodex',
  description: 'Learn about NovelCodex — an AI-powered reader for cultivation and xianxia novels.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/library" className="group shrink-0">
            <h1 className="text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">NovelCodex</h1>
            <p className="hidden sm:block text-xs text-zinc-500">Every secret, every character, every world — ask anything.</p>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/library"
              className="hidden sm:flex items-center whitespace-nowrap rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-400/75 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400">
              ← Library
            </Link>
            <TokenWidget />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-amber-400">About NovelCodex</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>Last updated: May 2026</p>

        <section className="mb-8 space-y-4 leading-relaxed" style={{ color: 'var(--nc-text)' }}>
          <p>
            <strong>NovelCodex</strong> is an AI-powered reading companion for cultivation, xianxia,
            wuxia, and web-novel fiction. We index publicly available novel chapters and let readers
            explore stories through natural-language conversation — ask about characters, cultivation
            systems, plot arcs, or anything else hidden in thousands of chapters.
          </p>
          <p>
            Our platform uses retrieval-augmented generation (RAG) to search across indexed chapter
            text and synthesise accurate, source-grounded answers — so you always get real information
            from the novels you care about, not hallucination.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-amber-400">What we offer</h2>
          <ul className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>
            <li>✦ A searchable library of cultivation and xianxia web novels</li>
            <li>✦ Chapter-level AI chat — ask anything about any novel</li>
            <li>✦ Character roleplay — chat directly with your favourite characters</li>
            <li>✦ Multi-novel chat — compare characters, systems, and worlds across titles</li>
            <li>✦ Bookmark and track your favourite novels</li>
            <li>✦ Recently visited history so you never lose your place</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-amber-400">Content &amp; Copyright</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>
            NovelCodex indexes chapter text from publicly accessible web-novel hosting platforms for
            the purpose of enabling AI-powered search and conversation. We do not redistribute raw
            chapter text to end users. All original content remains the property of its respective
            authors and publishers. If you are a rights holder and wish to request removal of your
            content from our index, please contact us at{' '}
            <a href="mailto:dmca@novelcodex.org" className="text-amber-400 hover:underline">
              dmca@novelcodex.org
            </a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-amber-400">Contact</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>
            Questions, partnerships, or content removal requests:{' '}
            <a href="mailto:hello@novelcodex.org" className="text-amber-400 hover:underline">
              hello@novelcodex.org
            </a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
