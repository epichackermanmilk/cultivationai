// POST/DELETE /api/profile/avatar — user profile picture.
// Stored in a public Supabase Storage bucket; the URL is saved on the auth user's
// metadata (no schema migration needed). Auth via the nc_session cookie.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const BUCKET = 'avatars'
const MAX_BYTES = 15 * 1024 * 1024 // 15 MB raw — we downscale to a small webp anyway
// Every avatar is normalized to a square 512px webp regardless of input format.
const ALL_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif']

async function ensureBucket(sb: ReturnType<typeof admin>) {
  const { data } = await sb.storage.getBucket(BUCKET)
  if (!data) {
    await sb.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES })
  }
}

export async function POST(req: NextRequest) {
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image too large (max 15 MB)' }, { status: 400 })

  // Normalize ANY image to a square 512px webp (auto-crop + shrink). This makes the
  // stored file tiny and accepts png/jpg/webp/gif/etc. without per-format handling.
  let webp: Buffer
  try {
    const raw = Buffer.from(await file.arrayBuffer())
    webp = await sharp(raw, { animated: false })
      .resize(512, 512, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Could not read that image — try a JPG or PNG' }, { status: 400 })
  }

  try {
    await ensureBucket(sb)
    // Remove any prior copies in other formats so we don't leave orphans.
    await sb.storage.from(BUCKET).remove(ALL_EXTS.filter(e => e !== 'webp').map(e => `${user.id}.${e}`)).catch(() => {})
    const path = `${user.id}.webp`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, webp, { contentType: 'image/webp', upsert: true })
    if (upErr) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    const pub = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const avatar_url = `${pub}?v=${Date.now()}` // cache-bust so the new image shows immediately
    await sb.auth.admin.updateUserById(user.id, { user_metadata: { ...(user.user_metadata ?? {}), avatar_url } })
    return NextResponse.json({ avatar_url })
  } catch {
    return NextResponse.json({ error: 'Could not save image' }, { status: 500 })
  }
}

export async function DELETE() {
  const token = (await cookies()).get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await sb.storage.from(BUCKET).remove(ALL_EXTS.map(e => `${user.id}.${e}`)).catch(() => {})
    await sb.auth.admin.updateUserById(user.id, { user_metadata: { ...(user.user_metadata ?? {}), avatar_url: null } })
  } catch { /* non-fatal */ }
  return NextResponse.json({ avatar_url: null })
}
