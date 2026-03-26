'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { SplashScreen } from './SplashScreen'

export function BackendLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { loading, backendLoading, backendRetryCount } = useAuth()

  // Show splash screen only during initial auth loading.
  const showSplash = loading
  const backendStarting = backendLoading && backendRetryCount > 0

  return (
    <>
      {/* Splash screen only for initial auth loading */}
      {showSplash && (
        <SplashScreen 
          isLoading={showSplash}
          backendStarting={false}
          retryCount={0}
          maxRetries={8}
        />
      )}

      {/* Render children as soon as auth init finished (non-blocking for backend) */}
      {!loading && children}

      {/* Non-blocking backend starting indicator (small badge) */}
      {backendStarting && !loading && (
        <div className="fixed top-4 right-4 z-50 px-3 py-2 bg-yellow-100 text-yellow-900 rounded shadow">
          Backend wird gestartet (Versuch {backendRetryCount})
        </div>
      )}
    </>
  )
}
