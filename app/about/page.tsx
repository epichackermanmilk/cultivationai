import SiteHeader from '@/components/SiteHeader'
import Footer     from '@/components/Footer'

export const metadata = {
  title: 'About — NovelCodex',
  description: 'Learn about NovelCodex — an AI-powered reader for cultivation and xianxia novels.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      <SiteHeader />

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
