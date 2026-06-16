'use client'

// Shared building blocks for the /test* redesign surface (Netflix × AsuraScans ×
// Steam). Kept in one module so the homepage, browse, login, games and recommend
// pages share the exact same cover rendering, dominant-color "living background"
// extraction and auth-gating logic. Purple accent is the single token rgb(124,58,237).

import { useEffect, useState } from 'react'
import { coverSrc } from '@/lib/cover'

export interface Novel {
  slug: string; title: string; author: string; total_chapters: number
  genres: string[]; cover_url: string; locked?: boolean; coming_soon?: boolean
  description?: string
}

export type RGB = [number, number, number]
export const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

// Dominant-color extraction: same-origin cover → canvas → average of vivid pixels.
// Routed through /api/cover so canvas reads aren't CORS-tainted.
export function useDominantColor(src: string | null): RGB {
  const [rgb, setRgb] = useState<RGB>([124, 58, 237]) // default violet
  useEffect(() => {
    if (!src) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        const w = (c.width = 48), h = (c.height = 48)
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, w, h)
        const d = ctx.getImageData(0, 0, w, h).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2]
          const max = Math.max(R, G, B), min = Math.min(R, G, B)
          const sat = max === 0 ? 0 : (max - min) / max
          if (max < 40 || min > 215 || sat < 0.22) continue
          r += R; g += G; b += B; n++
        }
        if (n > 0 && !cancelled) setRgb([Math.round(r / n), Math.round(g / n), Math.round(b / n)])
      } catch { /* tainted/blocked — keep previous */ }
    }
    img.src = src
    return () => { cancelled = true }
  }, [src])
  return rgb
}

// ── Skeleton shimmer ─────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`tnl-skeleton ${className}`} />
}

// ── Cover image: fade-in + graceful title fallback ───────────────────────────────
export function Cover({ novel, className = '', eager = false }: { novel: Novel; className?: string; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-white/5 ${className}`}>
      {!loaded && !err && <Skeleton className="absolute inset-0" />}
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverSrc(novel.cover_url)} alt={novel.title} loading={eager ? 'eager' : 'lazy'} decoding="async"
          onLoad={() => setLoaded(true)} onError={() => setErr(true)}
          className={`h-full w-full object-cover transition-all duration-700 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-white/70">{novel.title}</div>
      )}
    </div>
  )
}

// ── Global styles shared by every /test* page ────────────────────────────────────
// Rendered once per page (styled-jsx dedupes identical global blocks fine, but we
// only mount it from the page root). Exposes the tnl-* utility classes.
export function TestStyles() {
  return (
    <style jsx global>{`
      .tnl-root { font-feature-settings: "cv02","cv03"; }
      .tnl-glass { background: rgba(10,8,18,0.6); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.07); }
      .tnl-panel { background: rgba(18,15,30,0.55); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; backdrop-filter: blur(12px); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
      .tnl-navbtn { display:flex; height:34px; width:34px; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#fff; font-size:18px; transition:.2s; }
      .tnl-navbtn:hover { background: rgba(var(--v),0.25); border-color: rgba(var(--v),0.5); }
      .tnl-rail { scrollbar-width: none; scroll-snap-type: x proximity; }
      .tnl-rail::-webkit-scrollbar { display: none; }
      .tnl-rail > * { scroll-snap-align: start; }
      .tnl-bgfade { transition: opacity 0.9s ease, background 0.9s ease; }
      @keyframes tnl-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
      .tnl-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 37%, rgba(255,255,255,0.04) 63%); background-size: 400% 100%; animation: tnl-shimmer 1.4s ease infinite; }
      @keyframes tnl-fadeup { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:none; } }
      .tnl-fadeup { animation: tnl-fadeup .5s cubic-bezier(0.16,1,0.3,1) both; }
      /* Asura-style cover sheen: a soft moving light on hover, no scaling. */
      .tnl-sheen { position:relative; }
      .tnl-sheen::after { content:''; position:absolute; inset:0; border-radius:inherit; opacity:0; transition:opacity .35s ease;
        background: radial-gradient(130% 80% at 50% 0%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 35%, transparent 60%); }
      .tnl-sheen:hover::after { opacity:1; }
    `}</style>
  )
}
