'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { BackendLoadingOverlay } from './BackendLoadingOverlay'

export function BackendLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { backendLoading, backendRetryCount } = useAuth()

  return (
    <>
      <BackendLoadingOverlay 
        isLoading={backendLoading} 
        retryCount={backendRetryCount}
        maxRetries={12}
      />
      {children}
    </>
  )
}
