/**
 * One-time setup endpoint — creates the profiles table.
 * Hit GET /api/setup once after deployment.
 * Protected by a secret key to prevent misuse.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  // Simple protection — caller must pass ?key=<VPS_API_KEY>
  const url    = new URL(req.url)
  const secret = url.searchParams.get('key')
  if (secret !== process.env.VPS_API_KEY)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Supabase doesn't expose raw SQL via the JS client, so we use the REST /rpc endpoint.
  // We attempt to insert a dummy row and catch the "table not found" error to detect state.
  // The actual table must be created via the SQL editor — this endpoint reports the status.
  const { error } = await sb.from('profiles').select('id').limit(1)

  if (error?.code === '42P01') {
    return NextResponse.json({
      status: 'missing',
      message: 'profiles table does not exist. Run supabase/profiles.sql in the Supabase SQL Editor.',
      sql: `
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  tokens integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);
      `.trim(),
    })
  }

  if (error) {
    return NextResponse.json({ status: 'error', message: error.message })
  }

  return NextResponse.json({ status: 'ok', message: 'profiles table exists and is accessible.' })
}
