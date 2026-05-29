'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

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
    const hash = window.location.hash.slice(1)   // strip leading #
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')

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
          body:    JSON.stringify({ access_token: accessToken }),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setStatus('error')
          setMessage(d.error ?? 'Sign-in failed — please try again')
          return
        }

        await refresh()
        // Return to the page the user was on before Google OAuth, default to library
        let returnTo = '/'
        try {
          returnTo = sessionStorage.getItem('nc_return_to') ?? '/library'
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
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}
    >
      <div className="text-center space-y-4 px-6">
        {status === 'loading' ? (
          <>
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-sm text-zinc-400">{message}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-red-400">{message}</p>
            <button
              onClick={() => router.replace('/')}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition"
            >
              Back to home
            </button>
          </>
        )}
      </div>
    </div>
  )
}
