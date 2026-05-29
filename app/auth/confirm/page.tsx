'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

/**
 * Branded email-confirmation landing page.
 *
 * Supabase redirects here after a user clicks the link in their confirmation email.
 * The verification happens on Supabase's end; they redirect here with the session
 * tokens in the URL hash fragment:
 *
 *   /auth/confirm#access_token=XXX&token_type=bearer&refresh_token=YYY&...
 *
 * We extract the access_token, POST it to /api/auth/oauth-callback (the same route
 * used for Google OAuth) which validates it and sets the nc_session cookie, then
 * call refresh() to update the auth context and redirect home.
 *
 * HOW TO CONFIGURE IN SUPABASE:
 *   1. Dashboard → Authentication → URL Configuration → Site URL = https://novelcodex.com
 *   2. Add https://novelcodex.com/auth/confirm to "Redirect URLs" allow-list
 *   3. Update email templates (Confirm signup / Magic Link) to:
 *      - Use this page URL as the redirect_to
 *      - Show "Sign in to NovelCodex" as the link text (not the raw URL)
 */

const G: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

export default function AuthConfirmPage() {
  const router     = useRouter()
  const { refresh } = useAuth()

  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        // Supabase appends the session tokens as a hash fragment after verification.
        // e.g. /auth/confirm#access_token=XXX&token_type=bearer&...
        const hash        = window.location.hash.slice(1)
        const hashParams  = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const errorDesc   = hashParams.get('error_description') ?? hashParams.get('error')

        if (errorDesc) throw new Error(errorDesc)

        if (!accessToken) {
          // Also check query string for error or legacy token params
          const qp  = new URLSearchParams(window.location.search)
          const err = qp.get('error_description') ?? qp.get('error')
          throw new Error(err ?? 'No confirmation token found — this link may have expired. Please sign up again or contact support.')
        }

        // Exchange the access token for an nc_session cookie (reuses the OAuth route)
        const res = await fetch('/api/auth/oauth-callback', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ access_token: accessToken }),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error ?? 'Confirmation failed — please try again.')
        }

        await refresh()
        setStatus('success')
        setTimeout(() => router.replace('/'), 1800)
      } catch (err: unknown) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Something went wrong — please try again.')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      style={{ background: 'var(--nc-bg)', color: 'var(--nc-text)' }}
    >
      {/* Branding */}
      <Link href="/" className="text-2xl font-black tracking-tight" style={G}>
        NovelCodex
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-[var(--nc-border)] p-8 text-center"
        style={{ background: 'var(--nc-bg2)' }}>

        {status === 'loading' && (
          <>
            <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium" style={{ color: 'var(--nc-text)' }}>
              Confirming your account…
            </p>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--nc-text2)' }}>
              Just a moment
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-amber-400">Email confirmed!</p>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--nc-text2)' }}>
              Welcome to NovelCodex. Taking you home…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mb-4 text-sm font-medium text-red-400">{message}</p>
            <Link
              href="/"
              className="block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition"
            >
              Back to NovelCodex
            </Link>
            <p className="mt-3 text-xs" style={{ color: 'var(--nc-text2)' }}>
              Need help?{' '}
              <a href="mailto:hello@novelcodex.com" className="text-amber-400 hover:underline">
                Contact support
              </a>
            </p>
          </>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--nc-text2)' }}>
        Sign in to continue to{' '}
        <span className="font-semibold" style={{ color: 'var(--nc-text)' }}>NovelCodex</span>
      </p>
    </div>
  )
}
