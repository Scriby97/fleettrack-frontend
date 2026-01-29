'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { BackendLoadingOverlay } from './BackendLoadingOverlay'

export function BackendLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { loading, backendLoading, backendRetryCount } = useAuth()

  // Show loading overlay if auth is still initializing OR backend is being checked
  const isLoading = loading || backendLoading

  return (
    <>
      <BackendLoadingOverlay 
        isLoading={isLoading} 
        retryCount={backendRetryCount}
        maxRetries={8}
      />
      {/* Only render children when fully loaded */}
      {!loading && children}
    </>
  )
}
