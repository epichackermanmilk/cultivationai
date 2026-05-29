import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      className="border-t border-[var(--nc-border)] mt-12 px-4 pt-6 pb-3 sm:py-8"
      style={{ background: 'var(--nc-bg2)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center sm:items-center justify-between gap-4 text-xs" style={{ color: 'var(--nc-text2)' }}>
        <span className="text-center sm:text-left">© {new Date().getFullYear()} NovelCodex. All rights reserved.</span>
        <div className="flex flex-wrap justify-center sm:justify-end gap-x-5 gap-y-2">
          <Link href="/about"        className="hover:text-amber-400 transition">About</Link>
          <Link href="/privacy"      className="hover:text-amber-400 transition">Privacy Policy</Link>
          <Link href="/terms"        className="hover:text-amber-400 transition">Terms of Service</Link>
          <Link href="/unsubscribe"  className="hover:text-amber-400 transition">Unsubscribe</Link>
          <a href="mailto:hello@novelcodex.org" className="hover:text-amber-400 transition">Contact</a>
        </div>
      </div>
    </footer>
  )
}
