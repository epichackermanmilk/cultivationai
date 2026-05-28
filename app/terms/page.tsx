import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — NovelBrain',
  description: 'NovelBrain Terms of Service — UGC liability, subscription, email compliance.',
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
    <div className="min-h-screen" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <header className="border-b border-[var(--nc-border)] px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-amber-400">NovelBrain</Link>
          <Link href="/library" className="text-sm" style={{ color: 'var(--nc-text2)' }}>← Library</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-amber-400">Terms of Service</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
          Effective date: May 1, 2026 · Last updated: May 2026
        </p>

        <p className="mb-8 text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>
          By accessing or using NovelBrain (&quot;Site,&quot; &quot;Service&quot;), you agree to be bound by these
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
            <a href="mailto:hello@novelbrain.ai" className="text-amber-400 hover:underline">
              hello@novelbrain.ai
            </a>{' '}
            if you suspect unauthorised access.
          </p>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms without prior notice.</p>
        </Section>

        <Section title="3. Tokens and Subscriptions">
          <p>NovelBrain may offer token-based access to AI features. Tokens are consumed when you use
          AI chat functionality. All token purchases are final and non-refundable unless required by
          applicable law. We reserve the right to modify token pricing or features with reasonable notice.
          Free tokens provided upon account creation have no monetary value and cannot be redeemed for cash.</p>
          <p>If we offer subscription plans in the future, subscriptions will auto-renew unless cancelled
          before the renewal date. You will receive notice of any subscription charges before they occur.
          To cancel, use the account settings or contact us at{' '}
            <a href="mailto:hello@novelbrain.ai" className="text-amber-400 hover:underline">
              hello@novelbrain.ai
            </a>.
          </p>
        </Section>

        <Section title="4. User-Generated Content (UGC)">
          <p>You may submit feedback, suggestions, bug reports, and novel requests through our feedback
          widget (&quot;User Content&quot;). By submitting User Content, you grant NovelBrain a non-exclusive,
          royalty-free, worldwide licence to use, display, and improve the Service using your feedback.</p>
          <p>You represent that your User Content does not violate any third-party rights, contain illegal
          material, or constitute spam. NovelBrain is not responsible for User Content submitted by other
          users.</p>
          <p><strong>Section 230 Notice:</strong> NovelBrain is an interactive computer service provider
          as defined by 47 U.S.C. § 230. We are not the publisher or speaker of any User Content
          submitted by users and are not liable for such content to the extent permitted by law.</p>
        </Section>

        <Section title="5. Intellectual Property">
          <p>All original content, design, and code on the Site (excluding indexed novel text owned by
          third-party authors) is owned by NovelBrain or its licensors. You may not copy, reproduce, or
          distribute our proprietary materials without express written consent.</p>
          <p>Novel chapter text indexed by our system remains the property of the respective authors and
          publishers. NovelBrain does not claim ownership of third-party literary works.</p>
        </Section>

        <Section title="6. DMCA / Content Removal">
          <p>If you believe content on our Site infringes your copyright, please send a DMCA notice to{' '}
            <a href="mailto:dmca@novelbrain.ai" className="text-amber-400 hover:underline">
              dmca@novelbrain.ai
            </a>{' '}
            including: (a) identification of the copyrighted work; (b) identification of the infringing
            material and its URL; (c) your contact information; (d) a statement of good faith belief;
            (e) a statement of accuracy under penalty of perjury; (f) your signature.
          </p>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          OR NON-INFRINGEMENT. AI-generated responses may contain errors or inaccuracies. NovelBrain
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
            <a href="mailto:hello@novelbrain.ai" className="text-amber-400 hover:underline">
              hello@novelbrain.ai
            </a>
          </p>
        </Section>

        <div className="mt-12 flex gap-4 text-xs" style={{ color: 'var(--nc-text2)' }}>
          <Link href="/about"   className="hover:text-amber-400 transition">About</Link>
          <Link href="/privacy" className="hover:text-amber-400 transition">Privacy Policy</Link>
          <Link href="/library" className="hover:text-amber-400 transition">Library</Link>
        </div>
      </main>
    </div>
  )
}
