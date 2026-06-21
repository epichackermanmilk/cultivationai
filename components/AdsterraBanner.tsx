'use client'

// A single Adsterra "Banner" unit. We load it via a real same-origin iframe
// (/api/ad-frame) rather than srcDoc: Adsterra's invoke.js needs a normally-navigated
// document (with an origin + referrer) for its script load and document.write to work.
// Each banner gets its own frame, so the global `atOptions` never clashes between units.
// Empty key → labelled placeholder.

export default function AdsterraBanner({ adKey, width, height, className }: {
  adKey: string; width: number; height: number; className?: string
}) {
  if (!adKey) {
    return (
      <div className={className}>
        <div className="mx-auto flex items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/25"
          style={{ maxWidth: width, height }}>Advertisement</div>
      </div>
    )
  }
  const src = `/api/ad-frame?key=${adKey}&w=${width}&h=${height}`
  return (
    <div className={className}>
      <iframe src={src} width={width} height={height} scrolling="no" title="advertisement"
        style={{ border: 0, display: 'block', margin: '0 auto', maxWidth: '100%' }} />
    </div>
  )
}
