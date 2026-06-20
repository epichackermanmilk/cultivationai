import Link from 'next/link'

// Shared footer for the redesigned pages. Dark/glass to match the new theme.
export default function TestFooter() {
  return (
    <footer className="relative z-10 mt-10 border-t border-white/10" style={{ background: 'rgba(10,8,18,0.5)' }}>
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black" style={{ background: 'rgba(124,58,237,0.9)' }}>NC</span>
          <span className="text-xs text-white/45">© 2026 NovelCodex · Every secret, every character, every world</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/55">
          <Link href="/browse" className="transition hover:text-white">Browse</Link>
          <Link href="/shop" className="transition hover:text-white">Shop</Link>
          <Link href="/about" className="transition hover:text-white">About</Link>
          <Link href="/support" className="transition hover:text-white">Support</Link>
          <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
          <Link href="/terms" className="transition hover:text-white">Terms</Link>
          <a href="mailto:hello@novelcodex.org" className="transition hover:text-white">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
