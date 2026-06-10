'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function OnboardingPage() {
  const router = useRouter()
  const { userProfile, organizationId } = useAuth()

  useEffect(() => {
    if (userProfile && organizationId) {
      router.replace('/')
    }
  }, [userProfile, organizationId, router])

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            href="/onboarding/invitations"
            className="group rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Option 1</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Organisationseinladungen</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Du hast bereits eine Einladung? Öffne den Einladungslink oder gib deinen Token ein.
            </p>
            <div className="mt-6 text-blue-600 dark:text-blue-400 font-medium">Zu den Einladungen</div>
          </Link>

          <Link
            href="/onboarding/create-organization"
            className="group rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Option 2</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Neue Organisation erstellen</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Starte mit einem kostenlosen Paket oder wähle einen größeren Plan für mehr Fahrzeuge und Nutzer.
            </p>
            <div className="mt-6 text-blue-600 dark:text-blue-400 font-medium">Organisation anlegen</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
