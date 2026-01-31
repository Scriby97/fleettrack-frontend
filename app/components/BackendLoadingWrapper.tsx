'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { SplashScreen } from './SplashScreen'

export function BackendLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { loading, backendLoading, backendRetryCount } = useAuth()

  // Show splash screen when:
  // 1. Initial loading (auth check)
  // 2. Backend is being started (health check retries)
  const showSplash = loading || backendLoading
  const backendStarting = backendLoading && backendRetryCount > 0

  return (
    <>
      {/* Unified Splash Screen */}
      <SplashScreen 
        isLoading={showSplash}
        backendStarting={backendStarting}
        retryCount={backendRetryCount}
        maxRetries={8}
      />
      
      {/* Only render children when fully loaded */}
      {!loading && children}
    </>
  )
}
