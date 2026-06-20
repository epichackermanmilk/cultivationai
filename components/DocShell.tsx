// Shared themed wrapper for static/doc pages (about, support, privacy, terms) so they
// match the redesign: dark purple-glass shell with TestHeader + TestFooter.
import TestHeader from '@/components/TestHeader'
import TestFooter from '@/components/TestFooter'
import { TestStyles } from '@/components/TestUI'

export default function DocShell({ title, subtitle, updated, children, maxW = 'max-w-3xl' }: {
  title: string; subtitle?: string; updated?: string; children: React.ReactNode; maxW?: string
}) {
  return (
    <div className="tnl-root relative min-h-screen text-white" style={{ ['--v' as string]: '124,58,237' }}>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: '#07060d' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 55% at 50% -10%, rgba(var(--v),0.2) 0%, transparent 55%)' }} />
      </div>

      <TestHeader />

      <main className={`relative z-10 mx-auto w-full ${maxW} px-4 pb-24 pt-12 sm:px-6`}>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
        {updated && <p className="mt-1 text-xs uppercase tracking-wider text-white/35">{updated}</p>}
        <div className="mt-8">{children}</div>
      </main>

      <TestFooter />
      <TestStyles />
    </div>
  )
}
