import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--nc-border)] mt-12 px-4 pt-6 pb-6 sm:py-8"
      style={{ background: 'var(--nc-bg2)' }}>
      <div className={`mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4`}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="" className="h-6 w-6 object-contain opacity-70" />
          <span className="text-xs font-semibold text-zinc-500">
            © {new Date().getFullYear()} NovelCodex
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center sm:justify-end gap-x-5 gap-y-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
          <Link href="/about"   className="hover:text-amber-400 transition">About</Link>
          <Link href="/support" className="hover:text-amber-400 transition">Support</Link>
          <Link href="/privacy" className="hover:text-amber-400 transition">Privacy</Link>
          <Link href="/terms"   className="hover:text-amber-400 transition">Terms</Link>
          <a href="mailto:hello@novelcodex.org" className="hover:text-amber-400 transition">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
