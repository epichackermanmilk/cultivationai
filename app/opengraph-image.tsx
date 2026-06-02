import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Branded social-share card used whenever a NovelCodex link is shared
// (landing page, library, and any route that doesn't define its own).
export const alt = 'NovelCodex — AI companion for web novels'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  let logoSrc = ''
  try {
    const logo = await readFile(join(process.cwd(), 'public', 'logo.png'))
    logoSrc = `data:image/png;base64,${logo.toString('base64')}`
  } catch { /* fall back to wordmark only */ }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090b',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Amber glow */}
        <div
          style={{
            position: 'absolute',
            top: -280,
            width: 1100,
            height: 1100,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(245,158,11,0.20), rgba(245,158,11,0) 60%)',
            display: 'flex',
          }}
        />
        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28, zIndex: 1 }}>
          {logoSrc ? <img src={logoSrc} width={124} height={124} style={{ objectFit: 'contain' }} /> : null}
          <div
            style={{
              display: 'flex',
              fontSize: 116,
              fontWeight: 800,
              letterSpacing: -3,
              backgroundImage: 'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            NovelCodex
          </div>
        </div>
        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 42,
            color: '#e4e4e7',
            textAlign: 'center',
            maxWidth: 920,
            lineHeight: 1.3,
            zIndex: 1,
          }}
        >
          Every secret, every character, every world — ask anything.
        </div>
        <div style={{ display: 'flex', marginTop: 38, fontSize: 26, color: '#a1a1aa', zIndex: 1 }}>
          AI reading companion · xianxia · cultivation · wuxia
        </div>
      </div>
    ),
    { ...size },
  )
}
