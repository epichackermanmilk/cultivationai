import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-16 text-center text-white sm:pb-0"
      style={{ ['--v' as string]: '124,58,237', background: '#07060d' }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: 'radial-gradient(85% 50% at 50% -8%, rgba(var(--v),0.18) 0%, transparent 55%)' }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="mb-8 h-20 w-20 object-contain opacity-60" />

      <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'rgb(var(--v))' }}>404</p>
      <h1 className="mb-3 text-3xl font-black tracking-tight">Page not found</h1>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-white/55">
        This page doesn&apos;t exist on NovelCodex. It may have been moved or removed.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          style={{ background: 'rgb(var(--v))' }}
        >
          ← Back home
        </Link>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-2.5 text-sm font-medium text-white/70 transition hover:text-white"
        >
          Browse novels
        </Link>
      </div>

      <div className="mt-12 flex gap-4 text-xs text-white/45">
        <Link href="/about"   className="transition hover:text-white">About</Link>
        <Link href="/support" className="transition hover:text-white">Support</Link>
        <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
      </div>
    </div>
  )
}
