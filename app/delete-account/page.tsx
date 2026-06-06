import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Delete Your Account — NovelCodex',
  description:
    'How to permanently delete your NovelCodex account and what data is removed. Delete instantly in the app, or request deletion by email.',
}

// Public, login-free page so anyone (and app-store reviewers) can read the
// account-deletion steps and data-handling details without signing in.

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0" style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}>
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-500/70">Account &amp; Data</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--nc-text)' }}>
            Delete your NovelCodex account
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--nc-text2)' }}>
            You can permanently delete your account and personal data at any time. There are two ways to do it.
          </p>
        </div>

        {/* Method 1 — self-serve */}
        <section className="mb-6 rounded-2xl border border-[var(--nc-border)] p-6" style={{ background: 'var(--nc-bg2)' }}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-400">1</span>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nc-text)' }}>Delete it yourself (instant)</h2>
          </div>
          <ol className="ml-1 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
            <li><strong className="text-[var(--nc-text)]">1.</strong> Sign in to NovelCodex (in the app or at novelcodex.org).</li>
            <li><strong className="text-[var(--nc-text)]">2.</strong> Open your <strong className="text-[var(--nc-text)]">Profile</strong> from the top-right menu.</li>
            <li><strong className="text-[var(--nc-text)]">3.</strong> Scroll to the <strong className="text-[var(--nc-text)]">Account &amp; Security</strong> section.</li>
            <li><strong className="text-[var(--nc-text)]">4.</strong> Tap <strong className="text-[var(--nc-text)]">Delete account</strong> and type your account email to confirm.</li>
            <li><strong className="text-[var(--nc-text)]">5.</strong> Your account and data are deleted <strong className="text-[var(--nc-text)]">immediately and permanently</strong>, and you are signed out.</li>
          </ol>
          <p className="mt-4">
            <Link href="/profile" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400">
              Go to Profile →
            </Link>
          </p>
        </section>

        {/* Method 2 — by email */}
        <section className="mb-6 rounded-2xl border border-[var(--nc-border)] p-6" style={{ background: 'var(--nc-bg2)' }}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-400">2</span>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nc-text)' }}>Request deletion by email</h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
            If you can&apos;t sign in, email{' '}
            <a href="mailto:privacy@novelcodex.org?subject=Account%20deletion%20request" className="text-amber-400 transition hover:text-amber-300">
              privacy@novelcodex.org
            </a>{' '}
            from the email address on your account and ask us to delete it. We verify ownership and complete the
            deletion within <strong className="text-[var(--nc-text)]">30 days</strong> (usually much sooner).
          </p>
        </section>

        {/* What is deleted / kept */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-red-500/25 p-5" style={{ background: 'var(--nc-bg2)' }}>
            <h3 className="mb-2 text-sm font-semibold text-red-400">Permanently deleted</h3>
            <ul className="space-y-1.5 text-sm" style={{ color: 'var(--nc-text2)' }}>
              <li>• Your login credentials and account</li>
              <li>• Profile and username</li>
              <li>• Token balance and reward history</li>
              <li>• Bookmarks and reading history</li>
              <li>• Saved chats and chat history</li>
              <li>• Support / feedback tied to your account</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--nc-border)] p-5" style={{ background: 'var(--nc-bg2)' }}>
            <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--nc-text)' }}>Retained (limited)</h3>
            <ul className="space-y-1.5 text-sm" style={{ color: 'var(--nc-text2)' }}>
              <li>• Payment receipts held by our payment processor (Stripe) for legal and accounting purposes, per their retention policy. These are not used to re-identify you.</li>
              <li>• Anonymized, aggregated usage stats that contain no personal data.</li>
            </ul>
          </div>
        </section>

        <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>
          Questions about your data? See our{' '}
          <Link href="/privacy" className="text-amber-400 hover:text-amber-300">Privacy Policy</Link>{' '}
          or contact{' '}
          <a href="mailto:privacy@novelcodex.org" className="text-amber-400 hover:text-amber-300">privacy@novelcodex.org</a>.
        </p>
      </main>

      <Footer />
    </div>
  )
}
