// On-site chapter reader (test). Server component: pulls chapter text from the
// scraped JSON via the VPS (no embeddings → cheap, works for any scraped novel),
// cleans scrape boilerplate, and hands it to ReaderClient (font/theme/progress).

import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getChapter } from '@/lib/vps'
import { isLocked, lockThreshold } from '@/lib/locks'
import ReaderClient from '@/components/ReaderClient'
import ChapterPaywall from '@/components/ChapterPaywall'

interface Props { params: Promise<{ slug: string; number: string }> }

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Does the signed-in caller have access to this specific locked chapter?
async function hasChapterAccess(slug: string, chapter: number): Promise<boolean> {
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return false
  const sb = admin()
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return false
  const { data: prof } = await sb.from('profiles').select('subscription_active').eq('id', user.id).maybeSingle()
  if (prof?.subscription_active) return true
  const { data: owned } = await sb.from('chapter_unlocks').select('chapter_number').eq('user_id', user.id).eq('slug', slug).eq('chapter_number', chapter).maybeSingle()
  return !!owned
}

// Strip scrape boilerplate (translator/editor credits, word-count tags, the novel
// title repeated, lone dashes) and lift the chapter title out of the first line.
function cleanChapter(text: string, novelTitle: string): { heading: string | null; body: string[] } {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
  let heading: string | null = null
  let start = 0
  if (lines.length && /^chapter\b/i.test(lines[0])) { heading = lines[0]; start = 1 }
  const body: string[] = []
  for (let i = start; i < lines.length; i++) {
    const l = lines[i]
    if (/^(translator|editor|proofreader|proof-?reader|tl\s*check(er)?)\s*:?\s*$/i.test(l)) continue
    if (/translations?$/i.test(l) && l.split(/\s+/).length <= 4) continue
    if (/^\[\s*[\d,]+\s*words?\s*\]$/i.test(l)) continue
    if (/^[-–—•\s]+$/.test(l)) continue
    if (novelTitle && l.toLowerCase() === novelTitle.toLowerCase()) continue
    body.push(l)
  }
  return { heading, body }
}

export default async function ReaderPage({ params }: Props) {
  const { slug, number } = await params
  const n = Math.max(1, parseInt(number, 10) || 1)
  const ch = await getChapter(slug, n)

  if (!ch) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-white" style={{ background: '#07060d' }}>
        <p className="text-lg text-white/70">Chapter not available.</p>
        <Link href={`/novel/${slug}`} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'rgb(124,58,237)' }}>← Back to novel</Link>
      </div>
    )
  }

  // Gate the latest 20% of chapters behind a subscription or token unlock.
  if (isLocked(ch.chapter_number, ch.total) && !(await hasChapterAccess(slug, ch.chapter_number))) {
    return <ChapterPaywall slug={slug} novelTitle={ch.novel_title} chapterNumber={ch.chapter_number} latestFree={lockThreshold(ch.total)} />
  }

  const { heading, body } = cleanChapter(ch.text, ch.novel_title)

  return (
    <ReaderClient slug={slug} novelTitle={ch.novel_title} chapterNumber={ch.chapter_number}
      heading={heading} body={body} total={ch.total} prev={ch.prev} next={ch.next} />
  )
}
