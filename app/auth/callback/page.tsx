'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { track, trackSignupConversion } from '@/lib/analytics'

/**
 * Google OAuth callback page.
 *
 * Supabase redirects here after Google auth with the token in the URL fragment:
 *   /auth/callback#access_token=...&refresh_token=...&token_type=bearer&...
 *
 * We can't read the fragment server-side, so this client component:
 * 1. Parses the fragment
 * 2. POSTs the access_token to /api/auth/oauth-callback (which sets nc_session cookie)
 * 3. Calls refresh() so the auth context picks up the new user
 * 4. Redirects to /
 */
export default function AuthCallbackPage() {
  const router  = useRouter()
  const { refresh } = useAuth()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState('Signing you in…')

  useEffect(() => {
    // ── Native app flow ──────────────────────────────────────────────────────
    // When OAuth ran in the system browser (redirect_to had ?app=1), we can't set
    // the app's cookie from here (wrong browser). Instead hand the token to the app
    // via a custom-scheme deep link; the app re-opens THIS page (without app=1)
    // inside its own webview, where the cookie can actually be set.
    if (new URLSearchParams(window.location.search).get('app') === '1') {
      window.location.href = 'org.novelcodex.app://auth-callback' + window.location.hash
      return
    }

    const hash = window.location.hash.slice(1)   // strip leading #
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken) {
      // Could also be ?error=... from the query string
      const qParams = new URLSearchParams(window.location.search)
      const err = qParams.get('error_description') ?? qParams.get('error') ?? 'No token received'
      setStatus('error')
      setMessage(err)
      return
    }

    ;(async () => {
      try {
        const res = await fetch('/api/auth/oauth-callback', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setStatus('error')
          setMessage(d.error ?? 'Sign-in failed — please try again')
          return
        }

        // New Google account → count it as a signup + Google Ads conversion (once).
        try {
          const d = await res.json().catch(() => ({})) as { isNew?: boolean }
          if (d.isNew) { track('sign_up', { method: 'google' }); trackSignupConversion() }
        } catch { /* ignore */ }

        await refresh()
        // Return to the page the user was on before Google OAuth, default to home
        let returnTo = '/'
        try {
          returnTo = sessionStorage.getItem('nc_return_to') ?? '/'
          sessionStorage.removeItem('nc_return_to')
        } catch { /* ignore */ }
        router.replace(returnTo)
      } catch {
        setStatus('error')
        setMessage('Network error — please try again')
      }
    })()
  }, [refresh, router])

  return (
    <div className="flex min-h-screen items-center justify-center text-white" style={{ background: '#07060d' }}>
      <div className="space-y-4 px-6 text-center">
        {status === 'loading' ? (
          <>
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-[rgb(124,58,237)] border-t-transparent animate-spin" />
            <p className="text-sm text-white/50">{message}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-red-400">{message}</p>
            <button
              onClick={() => router.replace('/')}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ background: 'rgb(124,58,237)' }}
            >
              Back to home
            </button>
          </>
        )}
      </div>
    </div>
  )
}
