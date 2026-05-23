import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      className="border-t border-[var(--nc-border)] mt-12 px-4 py-6"
      style={{ background: 'var(--nc-bg2)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs" style={{ color: 'var(--nc-text2)' }}>
        <span>© {new Date().getFullYear()} NovelCodex. All rights reserved.</span>
        <div className="flex flex-wrap gap-4">
          <Link href="/about"   className="hover:text-amber-400 transition">About</Link>
          <Link href="/privacy" className="hover:text-amber-400 transition">Privacy Policy</Link>
          <Link href="/terms"   className="hover:text-amber-400 transition">Terms of Service</Link>
          <a href="mailto:hello@novelcodex.com" className="hover:text-amber-400 transition">Contact</a>
        </div>
      </div>
    </footer>
  )
}
