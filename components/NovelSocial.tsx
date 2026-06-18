'use client'

// Ratings + comments for a novel (test surface). Reuses /api/novels/[slug]/rating
// and /comments. Avatars come from each comment's denormalised author_avatar.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { track } from '@/lib/analytics'

interface Comment { id: string; user_id: string; author_name: string | null; author_avatar: string | null; body: string; created_at: string }
interface RatingState { average: number; count: number; mine: number | null; enabled: boolean }

function rel(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = s / 60; if (m < 60) return `${Math.floor(m)}m ago`
  const h = m / 60; if (h < 24) return `${Math.floor(h)}h ago`
  const d = h / 24; if (d < 7) return `${Math.floor(d)}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(ts).toLocaleDateString()
}

function Stars({ value, onPick, size = 22 }: { value: number; onPick?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} disabled={!onPick} onClick={() => onPick?.(n)}
          onMouseEnter={() => onPick && setHover(n)} onMouseLeave={() => onPick && setHover(0)}
          className={onPick ? 'transition hover:scale-110' : 'cursor-default'} aria-label={`${n} star`}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= shown ? 'rgb(var(--v))' : 'none'} stroke="rgb(var(--v))" strokeWidth="1.5">
            <path d="M12 2l2.9 6.26 6.9.6-5.2 4.56 1.5 6.74L12 17.27 5.9 20.7l1.5-6.74L2.2 8.86l6.9-.6L12 2z" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ring-1 ring-white/15" style={{ background: 'rgba(var(--v),0.85)' }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="h-full w-full object-cover" />
        : (name || '?')[0]?.toUpperCase()}
    </span>
  )
}

export default function NovelSocial({ slug }: { slug: string }) {
  const { user } = useAuth()
  const [rating, setRating] = useState<RatingState>({ average: 0, count: 0, mine: null, enabled: true })
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsEnabled, setCommentsEnabled] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/novels/${slug}/rating`).then(r => r.json()).then(setRating).catch(() => {})
    fetch(`/api/novels/${slug}/comments`).then(r => r.json()).then(d => { setComments(d.comments ?? []); setCommentsEnabled(d.enabled !== false) }).catch(() => {})
  }, [slug])

  async function pickRating(n: number) {
    if (!user) return
    const prev = rating
    setRating(r => ({ ...r, mine: n }))
    try {
      const res = await fetch(`/api/novels/${slug}/rating`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: n }) })
      const d = await res.json()
      if (res.ok) { setRating(d); track('rating_submit', { slug, rating: n }) } else setRating(prev)
    } catch { setRating(prev) }
  }

  async function postComment() {
    const text = draft.trim()
    if (!text || posting) return
    setPosting(true); setErr(null)
    try {
      const res = await fetch(`/api/novels/${slug}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Could not post'); return }
      setComments(c => [d.comment, ...c]); setDraft(''); track('comment_post', { slug })
    } catch { setErr('Could not post — try again') } finally { setPosting(false) }
  }

  async function del(id: string) {
    setComments(c => c.filter(x => x.id !== id))
    try { await fetch(`/api/novels/${slug}/comments`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }) } catch {}
  }

  return (
    <section className="mt-8">
      {/* Ratings */}
      <div className="tnld-panel mb-5 flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-black leading-none" style={{ color: 'rgb(var(--v))' }}>{rating.average ? rating.average.toFixed(1) : '—'}</p>
            <p className="mt-1 text-[11px] text-white/45">{rating.count} rating{rating.count !== 1 ? 's' : ''}</p>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/45">{rating.mine ? 'Your rating' : 'Rate this novel'}</p>
            {user ? <Stars value={rating.mine ?? 0} onPick={pickRating} />
              : <Link href={`/login?return=/novel/${slug}`} className="text-sm font-semibold" style={{ color: 'rgb(var(--v))' }}>Sign in to rate →</Link>}
          </div>
        </div>
      </div>

      {/* Comments */}
      <h2 className="mb-3 text-lg font-bold">Comments {comments.length > 0 && <span className="text-white/40">({comments.length})</span>}</h2>

      {!commentsEnabled ? (
        <div className="tnld-panel p-5 text-sm text-white/50">Comments are coming soon for this novel.</div>
      ) : (
        <>
          {user ? (
            <div className="tnld-panel mb-4 p-4">
              <div className="flex gap-3">
                <Avatar url={user.avatar_url} name={user.username || user.email} />
                <div className="flex-1">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={2000}
                    placeholder="Share your thoughts (no spoilers without warning)…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition focus:border-[rgba(var(--v),0.6)]" />
                  <div className="mt-2 flex items-center justify-between">
                    {err ? <span className="text-xs text-red-400">{err}</span> : <span className="text-xs text-white/35">{draft.length}/2000</span>}
                    <button onClick={postComment} disabled={posting || !draft.trim()}
                      className="rounded-lg px-4 py-1.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40" style={{ background: 'rgb(var(--v))' }}>
                      {posting ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="tnld-panel mb-4 flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-white/60">Sign in to join the conversation.</p>
              <Link href={`/login?return=/novel/${slug}`} className="shrink-0 rounded-lg px-4 py-1.5 text-sm font-bold text-white transition hover:brightness-110" style={{ background: 'rgb(var(--v))' }}>Sign in</Link>
            </div>
          )}

          {comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">No comments yet — be the first.</p>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="tnld-panel flex gap-3 p-4">
                  <Avatar url={c.author_avatar} name={c.author_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{c.author_name || 'Reader'}</span>
                      <span className="text-[11px] text-white/35">{rel(c.created_at)}</span>
                      {user?.id === c.user_id && <button onClick={() => del(c.id)} className="ml-auto text-[11px] text-white/35 transition hover:text-red-400">Delete</button>}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
