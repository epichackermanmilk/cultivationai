'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { isNativeAppClient } from '@/lib/native'
import AuthModal from '@/components/AuthModal'

// Mobile app only: require an account before the app can be used, and send
// signed-in users straight to the library instead of the marketing landing page.
// On the web (no NovelCodexApp UA) this renders nothing and changes nothing.
export default function MobileAuthGate() {
  const { user, loading } = useAuth()
  const [native, setNative] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => { setNative(isNativeAppClient()) }, [])

  // Signed-in app users shouldn't see the marketing landing — go to the library.
  useEffect(() => {
    if (native && !loading && user && pathname === '/') router.replace('/library')
  }, [native, loading, user, pathname, router])

  if (!native || loading || user) return null

  // Inside the app and not signed in → hard login wall over everything.
  return <AuthModal forced onClose={() => {}} />
}
