import Link from 'next/link'
import TokenWidget from '@/components/TokenWidget'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Terms of Service — NovelCodex',
  description: 'NovelCodex Terms of Service — UGC liability, subscription, email compliance.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-amber-400">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--nc-border)] bg-[var(--nc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/library" className="group shrink-0 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 group-hover:text-amber-300 transition">NovelCodex</h1>
              <p className="hidden sm:block text-xs text-zinc-500">Every secret, every character, every world — ask anything.</p>
            </div>
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
        <h1 className="mb-2 text-3xl font-bold text-amber-400">Terms of Service</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
          Effective date: May 1, 2026 · Last updated: May 2026
        </p>

        <p className="mb-8 text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>
          By accessing or using NovelCodex (&quot;Site,&quot; &quot;Service&quot;), you agree to be bound by these
          Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Site.
        </p>

        <Section title="1. Use of the Service">
          <p>You must be at least 13 years old to use this Service. You agree to use the Service only for
          lawful purposes and in accordance with these Terms. You may not use the Service to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Violate any applicable law or regulation</li>
            <li>Transmit spam, unsolicited communications, or automated queries at scale without consent</li>
            <li>Attempt to reverse-engineer, scrape, or abuse our API beyond normal usage</li>
            <li>Circumvent rate limits, authentication, or other security controls</li>
            <li>Impersonate any person or entity</li>
          </ul>
        </Section>

        <Section title="2. User Accounts">
          <p>You are responsible for maintaining the confidentiality of your account credentials. You are
          responsible for all activities that occur under your account. Notify us immediately at{' '}
            <a href="mailto:hello@novelcodex.org" className="text-amber-400 hover:underline">
              hello@novelcodex.org
            </a>{' '}
            if you suspect unauthorised access.
          </p>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms without prior notice.</p>
        </Section>

        <Section title="3. Tokens and Subscriptions">
          <p>NovelCodex may offer token-based access to AI features. Tokens are consumed when you use
          AI chat functionality. All token purchases are final and non-refundable unless required by
          applicable law. We reserve the right to modify token pricing or features with reasonable notice.
          Free tokens provided upon account creation have no monetary value and cannot be redeemed for cash.</p>
          <p>If we offer subscription plans in the future, subscriptions will auto-renew unless cancelled
          before the renewal date. You will receive notice of any subscription charges before they occur.
          To cancel, use the account settings or contact us at{' '}
            <a href="mailto:hello@novelcodex.org" className="text-amber-400 hover:underline">
              hello@novelcodex.org
            </a>.
          </p>
        </Section>

        <Section title="4. User-Generated Content (UGC)">
          <p>You may submit feedback, suggestions, bug reports, and novel requests through our feedback
          widget (&quot;User Content&quot;). By submitting User Content, you grant NovelCodex a non-exclusive,
          royalty-free, worldwide licence to use, display, and improve the Service using your feedback.</p>
          <p>You represent that your User Content does not violate any third-party rights, contain illegal
          material, or constitute spam. NovelCodex is not responsible for User Content submitted by other
          users.</p>
          <p><strong>Section 230 Notice:</strong> NovelCodex is an interactive computer service provider
          as defined by 47 U.S.C. § 230. We are not the publisher or speaker of any User Content
          submitted by users and are not liable for such content to the extent permitted by law.</p>
        </Section>

        <Section title="5. Intellectual Property">
          <p>All original content, design, and code on the Site (excluding indexed novel text owned by
          third-party authors) is owned by NovelCodex or its licensors. You may not copy, reproduce, or
          distribute our proprietary materials without express written consent.</p>
          <p>Novel chapter text indexed by our system remains the property of the respective authors and
          publishers. NovelCodex does not claim ownership of third-party literary works.</p>
        </Section>

        <Section title="6. DMCA / Content Removal">
          <p>If you believe content on our Site infringes your copyright, please send a DMCA notice to{' '}
            <a href="mailto:dmca@novelcodex.org" className="text-amber-400 hover:underline">
              dmca@novelcodex.org
            </a>{' '}
            including: (a) identification of the copyrighted work; (b) identification of the infringing
            material and its URL; (c) your contact information; (d) a statement of good faith belief;
            (e) a statement of accuracy under penalty of perjury; (f) your signature.
          </p>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          OR NON-INFRINGEMENT. AI-generated responses may contain errors or inaccuracies. NovelCodex
          does not warrant that the Service will be uninterrupted or error-free.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, NOVELCODEX SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE
          OF THE SERVICE. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID
          TO US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $10, WHICHEVER IS GREATER.</p>
        </Section>

        <Section title="9. Governing Law">
          <p>These Terms are governed by the laws of the United States, without regard to conflict-of-law
          principles. Disputes shall be resolved through binding arbitration under the AAA Consumer
          Arbitration Rules, except you may bring claims in small claims court.</p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>We may revise these Terms at any time. We will post the updated Terms with a new effective
          date. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="11. Contact">
          <p>
            <a href="mailto:hello@novelcodex.org" className="text-amber-400 hover:underline">
              hello@novelcodex.org
            </a>
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
