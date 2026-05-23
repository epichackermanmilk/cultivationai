/**
 * Temporary test endpoint — DELETE AFTER TESTING
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(req: Request) {
  const url    = new URL(req.url)
  const secret = url.searchParams.get('key')
  if (secret !== process.env.VPS_API_KEY)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = admin()
  const results: Record<string, unknown> = {}

  // Test 1: can we list users?
  try {
    const { data, error } = await sb.auth.admin.listUsers({ perPage: 1 })
    results.listUsers = error ? `ERROR: ${error.message}` : `OK (${data?.users?.length ?? 0} users returned)`
  } catch (e) { results.listUsers = `EXCEPTION: ${e}` }

  // Test 2: create a throwaway test user
  const testEmail = `autotest_${Date.now()}@novelcodex.com`
  let testUserId = ''
  try {
    const { data, error } = await sb.auth.admin.createUser({
      email: testEmail, password: 'TestPass999!', email_confirm: true,
      user_metadata: { tokens: 100 },
    })
    testUserId = data?.user?.id ?? ''
    results.createUser = error ? `ERROR: ${error.message}` : `OK (id: ${testUserId?.slice(0, 8)}...)`
  } catch (e) { results.createUser = `EXCEPTION: ${e}` }

  // Test 3: sign in
  let accessToken = ''
  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: testEmail, password: 'TestPass999!',
    })
    accessToken = data?.session?.access_token ?? ''
    results.signIn = error ? `ERROR: ${error.message}` : `OK (token: ${accessToken.slice(0, 20)}...)`
  } catch (e) { results.signIn = `EXCEPTION: ${e}` }

  // Test 4: getUser from token
  if (accessToken) {
    try {
      const { data: { user }, error } = await sb.auth.getUser(accessToken)
      results.getUser = error ? `ERROR: ${error.message}` : `OK (email: ${user?.email}, meta_tokens: ${user?.user_metadata?.tokens})`
    } catch (e) { results.getUser = `EXCEPTION: ${e}` }
  } else {
    results.getUser = 'SKIPPED (no token)'
  }

  // Cleanup: delete test user
  if (testUserId) {
    try {
      await sb.auth.admin.deleteUser(testUserId)
      results.cleanup = 'OK'
    } catch { results.cleanup = 'FAILED' }
  }

  return NextResponse.json(results)
}
