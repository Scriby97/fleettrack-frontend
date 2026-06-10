'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function OnboardingInvitationsPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const normalizedToken = token.trim()
    if (!normalizedToken) {
      setError('Bitte gib einen Einladungstoken ein.')
      return
    }

    router.push(`/invite/${normalizedToken}`)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-10 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div>
          <Link href="/onboarding" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← Zurück
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Organisationseinladungen</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Öffne deinen Einladungslink oder gib den Einladungstoken ein.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Einladungstoken
              </label>
              <input
                id="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="z. B. 1f4c7f8f-..."
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Einladung öffnen
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Hinweis: Nach erfolgreicher Einladung wirst du automatisch einer Organisation zugeordnet und kannst FleetTrack direkt nutzen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
