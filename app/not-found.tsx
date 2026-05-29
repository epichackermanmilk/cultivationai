import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}
    >
      <img src="/logo.png" alt="" className="h-20 w-20 object-contain mb-8 opacity-50" />

      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-500/70">404</p>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-amber-400">
        Page not found
      </h1>
      <p className="mb-8 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--nc-text2)' }}>
        This chapter doesn&apos;t exist in the Codex. The page you&apos;re looking for may have been
        moved or removed.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition"
        >
          ← Back to Library
        </Link>
        <Link
          href="/support"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--nc-border)] px-6 py-2.5 text-sm font-medium transition hover:border-amber-500/40"
          style={{ color: 'var(--nc-text2)' }}
        >
          Report an issue
        </Link>
      </div>

      <div className="mt-12 flex gap-4 text-xs" style={{ color: 'var(--nc-text2)' }}>
        <Link href="/about"   className="hover:text-amber-400 transition">About</Link>
        <Link href="/privacy" className="hover:text-amber-400 transition">Privacy</Link>
        <Link href="/terms"   className="hover:text-amber-400 transition">Terms</Link>
      </div>
    </div>
  )
}
