'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { BackendLoadingOverlay } from './BackendLoadingOverlay'

export function BackendLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { loading, backendLoading, backendRetryCount } = useAuth()

  // Show backend loading overlay when checking backend health
  // Show simple spinner when auth is loading but backend check is done
  const showBackendOverlay = backendLoading
  const showSimpleSpinner = loading && !backendLoading

  return (
    <>
      {/* Backend health check overlay */}
      <BackendLoadingOverlay 
        isLoading={showBackendOverlay} 
        retryCount={backendRetryCount}
        maxRetries={8}
      />
      
      {/* Simple spinner while loading auth/profile data */}
      {showSimpleSpinner && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      
      {/* Only render children when fully loaded */}
      {!loading && children}
    </>
  )
}
