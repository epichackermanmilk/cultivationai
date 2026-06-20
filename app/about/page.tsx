import Link from 'next/link'
import DocShell from '@/components/DocShell'

export const metadata = {
  title: 'About — NovelCodex',
  description: 'NovelCodex — a free online reader for cultivation, xianxia and web novels, with AI chat, character roleplay, and games.',
}

export default function AboutPage() {
  return (
    <DocShell title="About NovelCodex" updated="Updated June 2026">
      <div className="space-y-10 text-[15px] leading-relaxed text-white/75">
        <section className="space-y-4">
          <p>
            <strong className="text-white">NovelCodex</strong> is a free online home for cultivation,
            xianxia, wuxia and web-novel fiction. Read thousands of novels on-site in a clean,
            distraction-light reader — then go deeper with AI that actually understands the story.
          </p>
          <p>
            Reading is free and ad-supported. Tokens and subscriptions unlock the extras: chatting with
            a novel, roleplaying with its characters, smart recommendations, the latest locked chapters,
            and EPUB downloads.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-white">What you can do</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ['📖', 'Read thousands of novels free on-site'],
              ['💬', 'Chat with any novel — ask about plot, characters, systems'],
              ['🎭', 'Roleplay directly with your favourite characters'],
              ['🧭', 'Get AI recommendations tuned to your taste'],
              ['🎮', 'Play cultivation-themed mini-games'],
              ['🔖', 'Bookmark novels and pick up where you left off'],
            ].map(([icon, text]) => (
              <li key={text} className="tnl-panel flex items-center gap-3 rounded-xl p-3 text-sm text-white/80">
                <span className="text-lg">{icon}</span>{text}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Free reading &amp; supporters</h2>
          <p>
            Every novel is free to read up to its latest chapters. The most recent ~20% of each novel is
            reserved for supporters — read them with any active <Link href="/shop" className="font-semibold underline decoration-[rgba(var(--v),0.6)]" style={{ color: 'rgb(var(--v))' }}>subscription</Link>,
            or unlock individual chapters with tokens. Subscriptions also remove ads and include free EPUB downloads.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Content &amp; copyright</h2>
          <p>
            NovelCodex aggregates chapter text from publicly accessible web-novel platforms. All original
            content remains the property of its respective authors and publishers. If you are a rights
            holder and want your work removed, email{' '}
            <a href="mailto:dmca@novelcodex.org" className="font-semibold underline" style={{ color: 'rgb(var(--v))' }}>dmca@novelcodex.org</a>{' '}
            and we will take it down promptly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <p>
            Questions, partnerships, or anything else:{' '}
            <a href="mailto:hello@novelcodex.org" className="font-semibold underline" style={{ color: 'rgb(var(--v))' }}>hello@novelcodex.org</a>.
            Need help? Visit <Link href="/support" className="font-semibold underline" style={{ color: 'rgb(var(--v))' }}>Support</Link>.
          </p>
        </section>
      </div>
    </DocShell>
  )
}
