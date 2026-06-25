import DocShell from '@/components/DocShell'

export const metadata = {
  title: 'Privacy Policy — Novel Translate',
  description: 'Privacy policy for the Novel Translate browser extension: what data is handled and how.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold" style={{ color: 'rgb(var(--v))' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/75">{children}</div>
    </section>
  )
}

export default function NovelTranslatePolicyPage() {
  return (
    <DocShell title="Privacy Policy — Novel Translate" updated="Last updated June 24, 2026">
      <div className="text-white/75">
        <p className="mb-8 text-sm leading-relaxed text-white/75">
          Novel Translate (&quot;the extension&quot;) helps you translate Chinese, Japanese, and Korean
          novel and comic text into English. This policy explains what data is handled and how.
        </p>

        <Section title="What we process">
          <ul className="ml-4 list-disc space-y-2">
            <li><strong>Text you choose to translate.</strong> When you click the translate button, use
              right-click translate, or open a PDF in the reader, the selected text is sent to our
              translation backend, which forwards it to our translation provider (DeepSeek) to generate
              the English translation. This text is used only to produce your translation and is
              <strong> not stored</strong> by us and <strong>not sold</strong> to anyone.</li>
            <li><strong>Settings stored on your device.</strong> Your glossary, Quick Terms, saved site
              selectors, bookmarks, translation history, series progress, usage count, and (if you
              subscribe) your license key are stored locally in your browser via <code>chrome.storage</code>.
              They are not uploaded to us, except the license key, which is sent to our server only to
              verify your subscription.</li>
            <li><strong>Anonymous usage analytics (optional).</strong> If enabled, the extension may send
              anonymous event names (e.g. &quot;page translated&quot;) with a random, non-identifying client ID.
              It never includes the content you translate or any personal information. This is off unless
              an analytics endpoint is configured, and you can opt out at any time in the extension&apos;s
              Privacy settings.</li>
          </ul>
        </Section>

        <Section title="What we do NOT collect">
          <ul className="ml-4 list-disc space-y-1">
            <li>No name, email, or account is required to use the extension.</li>
            <li>We do not collect your browsing history.</li>
            <li>We do not sell or share your data with third parties for advertising.</li>
          </ul>
        </Section>

        <Section title="Payments">
          <p>Subscriptions are processed by <strong>Stripe</strong>. We do not receive or store your card
            details; Stripe handles payment information under its own privacy policy.</p>
        </Section>

        <Section title="Third parties">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>DeepSeek</strong> — receives the text you translate, to perform the translation.</li>
            <li><strong>Stripe</strong> — processes payments (subscribers only).</li>
            <li><strong>Cloudflare</strong> — hosts our backend proxy that routes translation requests.</li>
          </ul>
        </Section>

        <Section title="Data retention">
          <p>Translation text is processed transiently and not retained by us. Local data stays on your
            device until you remove it or uninstall the extension.</p>
        </Section>

        <Section title="Contact">
          <p>Questions: <a href="mailto:privacy@novelcodex.org" className="underline hover:opacity-80" style={{ color: 'rgb(var(--v))' }}>privacy@novelcodex.org</a></p>
        </Section>
      </div>
    </DocShell>
  )
}
