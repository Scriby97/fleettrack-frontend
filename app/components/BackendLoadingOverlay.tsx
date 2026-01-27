'use client'

import { useEffect, useState } from 'react'

interface BackendLoadingOverlayProps {
  isLoading: boolean
  retryCount?: number
  maxRetries?: number
}

export function BackendLoadingOverlay({ 
  isLoading, 
  retryCount = 0,
  maxRetries = 8 // 8 Versuche mit exponentiellem Backoff (~30-40 Sekunden)
}: BackendLoadingOverlayProps) {
  const [dots, setDots] = useState('')
  const [showFullMessage, setShowFullMessage] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setShowFullMessage(false)
      return
    }

    // Show full "Server starting" message only after 5 seconds
    const timer = setTimeout(() => {
      setShowFullMessage(true)
    }, 5000)

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [isLoading])

  if (!isLoading) return null

  const progress = maxRetries > 0 ? Math.min((retryCount / maxRetries) * 100, 100) : 0

  // Show minimal spinner for first 5 seconds
  if (!showFullMessage) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="inline-block">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  // Show full message after 5 seconds (if still loading)
  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Spinner */}
          <div className="inline-block mb-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>

          {/* Titel */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Server wird gestartet{dots}
          </h2>

          {/* Beschreibung */}
          <p className="text-gray-600 mb-4">
            Das Backend läuft auf einem kostenlosen Server und muss erst hochfahren. Dies kann bis zu 40 Sekunden dauern.
          </p>

          {/* Fortschrittsbalken */}
          {retryCount > 0 && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Versuch {retryCount} von {maxRetries}
              </p>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 mt-6">
            <p>Bitte haben Sie einen Moment Geduld...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
