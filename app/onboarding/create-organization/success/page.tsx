'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'

const POLL_INTERVAL_MS = 1500
const MAX_POLLS = 6

export default function CreateOrganizationSuccessPage() {
  const router = useRouter()
  const { refreshOrganizations } = useAuth()
  const [pollCount, setPollCount] = useState(0)
  const finishedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      for (let i = 0; i < MAX_POLLS; i++) {
        if (cancelled) return
        await refreshOrganizations()
        if (cancelled) return
        setPollCount(i + 1)
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }
      if (!cancelled) {
        finishedRef.current = true
        router.replace('/')
      }
    }

    poll()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleContinue = () => {
    router.replace('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Zahlung erfolgreich</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Deine Organisation wird aktiviert{pollCount > 0 && pollCount < MAX_POLLS ? '...' : '.'} Das kann einen
          Moment dauern.
        </p>

        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-6" />

        <button
          onClick={handleContinue}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Weiter zu FleetTrack
        </button>
      </div>
    </div>
  )
}
