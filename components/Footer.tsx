import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--nc-border)] mt-12 px-4 pt-6 pb-6 sm:py-8"
      style={{ background: 'var(--nc-bg2)' }}>
      {/* Option A — brand far left, links left-aligned right after it */}
      <div className="mx-auto max-w-7xl flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="" className="h-6 w-6 object-contain opacity-70" />
          <span className="text-xs font-semibold text-zinc-500">
            © {new Date().getFullYear()} NovelCodex
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-2 text-xs" style={{ color: 'var(--nc-text2)' }}>
          <Link href="/about"   className="hover:text-amber-400 transition">About</Link>
          <Link href="/support" className="hover:text-amber-400 transition">Support</Link>
          <Link href="/privacy" className="hover:text-amber-400 transition">Privacy</Link>
          <Link href="/terms"   className="hover:text-amber-400 transition">Terms</Link>
          <a href="mailto:hello@novelcodex.org" className="hover:text-amber-400 transition">Contact</a>
          <a href="https://discord.gg/xjQvnrvW3M" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-indigo-400 hover:text-indigo-300 transition">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Discord
          </a>
        </nav>
      </div>
    </footer>
  )
}
