'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { SplashScreen } from './SplashScreen'

export function BackendLoadingWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { loading, backendLoading, backendRetryCount, supabaseUser, userProfile, refreshUserRole, signOut } = useAuth()
  const [retrying, setRetrying] = useState(false)

  // Show splash screen when:
  // 1. Initial loading (auth check)
  // 2. Backend is being started (health check retries)
  const showSplash = loading || backendLoading
  const backendStarting = backendLoading && backendRetryCount > 0

  // A session exists but the profile fetch failed (e.g. /auth/me returned 401/500).
  // Never fall through to rendering the app in this state - we don't actually know
  // who the user is or whether they belong to an organization.
  const profileLoadFailed = !loading && !!supabaseUser && !userProfile

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await refreshUserRole()
    } finally {
      setRetrying(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Unified Splash Screen */}
      <SplashScreen
        isLoading={showSplash}
        backendStarting={backendStarting}
        retryCount={backendRetryCount}
        maxRetries={8}
      />

      {!loading && profileLoadFailed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
          <div className="max-w-md w-full text-center bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-8">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Profil konnte nicht geladen werden</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              Deine Sitzung konnte nicht verifiziert werden. Bitte versuche es erneut oder melde dich neu an.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retrying ? 'Wird erneut versucht...' : 'Erneut versuchen'}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Only render children once fully loaded and the profile is known */}
      {!loading && !profileLoadFailed && children}
    </>
  )
}
