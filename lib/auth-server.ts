import { createClient } from '@supabase/supabase-js'

// Shared server-side auth helpers. The app uses Supabase Auth with the service
// key; the browser session is the Supabase access_token stored in an httpOnly
// `nc_session` cookie (set by the login/signup routes).

export const SESSION_COOKIE = 'nc_session'

export const COOKIE_OPTS = {
  httpOnly: true,
  maxAge:   60 * 60 * 24 * 7,   // 7 days
  path:     '/',
  sameSite: 'lax' as const,
  secure:   process.env.NODE_ENV === 'production',
}

// The Supabase access_token in nc_session expires after ~1h. We also store the
// refresh_token (nc_refresh) so the session can be silently renewed — otherwise
// users get "session expired" after an hour. POST /api/auth/refresh uses it.
export const REFRESH_COOKIE = 'nc_refresh'

export const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  maxAge:   60 * 60 * 24 * 30,   // 30 days
  path:     '/',
  sameSite: 'lax' as const,
  secure:   process.env.NODE_ENV === 'production',
}

/** Service-role client — server-only. Bypasses RLS; never expose to the browser. */
export function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
