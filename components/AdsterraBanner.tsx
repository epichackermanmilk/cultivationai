'use client'

// A single Adsterra "Banner" ad unit. Adsterra's snippet relies on a GLOBAL
// `atOptions`, so multiple banners on one page would clobber each other — we isolate
// each in its own sandboxed <iframe> via srcDoc. Empty key → labelled placeholder.

import { useMemo } from 'react'

export default function AdsterraBanner({ adKey, width, height, className }: {
  adKey: string; width: number; height: number; className?: string
}) {
  const srcDoc = useMemo(() => (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head>` +
    `<body><script type="text/javascript">atOptions=` +
    `{'key':'${adKey}','format':'iframe','height':${height},'width':${width},'params':{}};` +
    `</script><script type="text/javascript" src="//www.highperformanceformat.com/${adKey}/invoke.js"></script>` +
    `</body></html>`
  ), [adKey, width, height])

  if (!adKey) {
    return (
      <div className={className}>
        <div className="mx-auto flex items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/25"
          style={{ maxWidth: width, height }}>Advertisement</div>
      </div>
    )
  }
  return (
    <div className={className}>
      <iframe srcDoc={srcDoc} width={width} height={height} scrolling="no" title="advertisement"
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{ border: 0, display: 'block', margin: '0 auto', maxWidth: '100%' }} />
    </div>
  )
}
