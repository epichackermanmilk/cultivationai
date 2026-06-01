import Link       from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import Footer     from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy — NovelCodex',
  description: 'NovelCodex Privacy Policy — CCPA compliant.',
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>

      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-amber-400">Privacy Policy</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--nc-text2)' }}>
          Effective date: May 1, 2026 · Last updated: May 2026
        </p>

        <p className="mb-8 text-sm leading-relaxed" style={{ color: 'var(--nc-text)' }}>
          NovelCodex (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information
          when you visit <strong>novelcodex.org</strong> (the &quot;Site&quot;). Please read this policy
          carefully. By using the Site, you consent to the practices described here.
        </p>

        <Section title="1. Information We Collect">
          <p><strong>Account data:</strong> When you create an account, we collect your email address and a
          hashed password. We do not store plaintext passwords.</p>
          <p><strong>Usage data:</strong> We may collect information about how you interact with the Site,
          including pages visited, novels bookmarked, and chat queries submitted. Queries are processed
          to generate AI responses and are not sold to third parties.</p>
          <p><strong>Automatically collected data:</strong> Server logs may capture your IP address, browser
          type, and referring URL for security and analytics purposes. This data is retained for up to 90 days.</p>
          <p><strong>Cookies &amp; local storage:</strong> We use browser local storage to remember your
          bookmarked novels and recently visited pages. No cross-site tracking cookies are set.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use collected information to: operate and improve the Site; respond to your requests;
          send transactional emails (e.g., account confirmation); detect and prevent fraud; and comply
          with legal obligations.</p>
          <p>We do <strong>not</strong> sell, rent, or trade your personal information to third parties
          for marketing purposes.</p>
        </Section>

        <Section title="3. Email Communications">
          <p>If you provide your email address, we may send you transactional messages (account creation,
          password reset). We will only send marketing emails if you explicitly opt in. You may unsubscribe
          from marketing emails at any time by clicking the unsubscribe link in any email or contacting us
          at <a href="mailto:privacy@novelcodex.org" className="text-amber-400 hover:underline">privacy@novelcodex.org</a>.
          We comply with the CAN-SPAM Act and GDPR email consent requirements.</p>
        </Section>

        <Section title="4. California Privacy Rights (CCPA)">
          <p>If you are a California resident, you have the following rights under the California Consumer
          Privacy Act (CCPA):</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Right to Know:</strong> Request disclosure of the categories and specific pieces
            of personal information we have collected about you.</li>
            <li><strong>Right to Delete:</strong> Request deletion of your personal information, subject
            to certain exceptions.</li>
            <li><strong>Right to Opt-Out:</strong> We do not sell personal information. You do not need
            to opt out of a sale.</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for
            exercising your CCPA rights.</li>
          </ul>
          <p>To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@novelcodex.org" className="text-amber-400 hover:underline">
              privacy@novelcodex.org
            </a>{' '}
            or use the feedback widget on the Site. We will respond within 45 days.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>Account data is retained until you delete your account. Chat history is session-based and not
          persistently stored on our servers. Server logs are retained for up to 90 days.</p>
        </Section>

        <Section title="6. Third-Party Services">
          <p>We use the following third-party services that may process your data:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Supabase</strong> — database and authentication (EU/US data centers). See{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Supabase Privacy Policy</a>.</li>
            <li><strong>OpenAI</strong> — AI text generation for chat responses. Queries are sent to
              OpenAI&apos;s API. See{' '}
              <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">OpenAI Privacy Policy</a>.</li>
            <li><strong>Stripe</strong> — payment processing for token purchases and subscriptions. We never
              store your full card details. See{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Stripe Privacy Policy</a>.</li>
            <li><strong>Google Analytics</strong> — anonymized traffic and usage analytics. See{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Google Privacy Policy</a>.</li>
            <li><strong>Google AdSense</strong> — third-party advertising. See the cookies section below.</li>
          </ul>
        </Section>

        <Section title="7. Cookies &amp; Advertising">
          <p>We use cookies and similar technologies for three purposes:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Strictly necessary</strong> — a secure, httpOnly session cookie keeps you signed in.
              This is required for the Site to function and cannot be disabled.</li>
            <li><strong>Analytics</strong> — Google Analytics cookies (e.g. <code>_ga</code>) help us understand
              traffic and improve the Site. Only set after you accept cookies.</li>
            <li><strong>Advertising</strong> — Google AdSense and its partners (including Google&apos;s
              DoubleClick) use cookies to serve and measure ads. Google may use the{' '}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">advertising cookie</a>{' '}
              to serve ads based on your visits to this and other sites.</li>
          </ul>
          <p className="mt-3">
            When you first visit, a cookie banner lets you <strong>Accept</strong> or <strong>Decline</strong>{' '}
            non-essential cookies. We use Google Consent Mode — if you decline, analytics and advertising
            cookies are not set, and ads (if shown) are non-personalized. You can change your choice any time
            by clearing your browser&apos;s site data. You may also opt out of personalized Google advertising
            at{' '}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Google Ads Settings</a>{' '}
            or{' '}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">aboutads.info</a>.
          </p>
          <p className="mt-3">
            Subscribers and users who purchase the ad-free upgrade do not see ads, and no advertising cookies
            are set for them.
          </p>
        </Section>

        <Section title="8. Security">
          <p>We implement industry-standard security measures including HTTPS, rate limiting, input
          validation, and httpOnly session cookies. No system is 100% secure; please use a strong,
          unique password for your account.</p>
        </Section>

        <Section title="9. Children&apos;s Privacy">
          <p>The Site is not directed to children under 13. We do not knowingly collect personal
          information from children under 13. If you believe a child has provided us personal information,
          contact us immediately.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy periodically. We will notify registered users of material
          changes by email or by a prominent notice on the Site. Continued use of the Site after changes
          constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            Privacy inquiries:{' '}
            <a href="mailto:privacy@novelcodex.org" className="text-amber-400 hover:underline">
              privacy@novelcodex.org
            </a>
            <br />
            DMCA / content removal:{' '}
            <a href="mailto:dmca@novelcodex.org" className="text-amber-400 hover:underline">
              dmca@novelcodex.org
            </a>
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
