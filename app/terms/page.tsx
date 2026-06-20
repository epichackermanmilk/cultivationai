import DocShell from '@/components/DocShell'

export const metadata = {
  title: 'Terms of Service — NovelCodex',
  description: 'NovelCodex Terms of Service — UGC liability, subscription, email compliance.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold" style={{ color: 'rgb(var(--v))' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/75">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <DocShell title="Terms of Service" updated="Effective May 1, 2026 · Updated June 2026">
      <div className="text-white/75">

        <p className="mb-8 text-sm leading-relaxed text-white/75">
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
            <a href="mailto:hello@novelcodex.org" className="underline hover:opacity-80">
              hello@novelcodex.org
            </a>{' '}
            if you suspect unauthorised access.
          </p>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms without prior notice.</p>
        </Section>

        <Section title="3. Tokens and Subscriptions">
          <p>Reading is free and ad-supported. Tokens are an in-app currency spent on extras — AI chat,
          recommendations, unlocking locked chapters, and EPUB downloads. Token purchases are
          non-refundable once tokens from that purchase have been used; otherwise we honour refund requests
          made within 7 days. Free tokens granted on sign-up have no monetary value and cannot be redeemed
          for cash. We may modify token pricing or features with reasonable notice.</p>
          <p>Subscriptions bill monthly through Stripe and auto-renew until cancelled. They include ad-free
          reading, access to all locked chapters, free EPUB downloads, and monthly tokens. <strong>Access to
          locked chapters via subscription lasts only while the subscription is active</strong> — chapters you
          unlocked with tokens remain yours. Cancel anytime from the Stripe billing portal or by contacting{' '}
            <a href="mailto:hello@novelcodex.org" className="underline hover:opacity-80">hello@novelcodex.org</a>.
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
            <a href="mailto:dmca@novelcodex.org" className="underline hover:opacity-80">
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
            <a href="mailto:hello@novelcodex.org" className="underline hover:opacity-80">
              hello@novelcodex.org
            </a>
          </p>
        </Section>
      </div>
    </DocShell>
  )
}
