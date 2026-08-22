'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { getMyInvites } from '@/lib/api/invites'

export default function OnboardingPage() {
  const router = useRouter()
  const { userProfile, hasOrganization } = useAuth()
  const [hasInvites, setHasInvites] = useState(false)

  useEffect(() => {
    if (userProfile && hasOrganization) {
      router.replace('/')
    }
  }, [userProfile, hasOrganization, router])

  useEffect(() => {
    if (!userProfile || hasOrganization) return

    let cancelled = false
    getMyInvites()
      .then((invites) => {
        if (!cancelled) setHasInvites(invites.length > 0)
      })
      .catch(() => {
        if (!cancelled) setHasInvites(false)
      })

    return () => {
      cancelled = true
    }
  }, [userProfile, hasOrganization])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-10 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Willkommen bei FleetTrack</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Dein Konto ist aktiv, aber noch keiner Organisation zugeordnet.
            Wähle den nächsten Schritt aus.
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-5 ${hasInvites ? 'md:grid-cols-2' : ''}`}>
          <Link
            href="/onboarding/create-organization"
            className="group rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Option 1</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Neue Organisation erstellen</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Wähle Lieutenant (kostenlos), Captain oder General und richte deine Organisation ein.
            </p>
            <div className="mt-6 text-blue-600 dark:text-blue-400 font-medium">Organisation anlegen</div>
          </Link>

          {hasInvites && (
            <Link
              href="/onboarding/invitations"
              className="group rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Option 2</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Organisationseinladungen</h2>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Du hast offene Einladungen zu einer Organisation. Sieh sie dir an und nimm sie an oder lehne sie ab.
              </p>
              <div className="mt-6 text-blue-600 dark:text-blue-400 font-medium">Zu den Einladungen</div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
