'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import Breadcrumbs from '@/app/components/Breadcrumbs'

export default function SettingsPage() {
  const router = useRouter()
  const { supabaseUser, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !supabaseUser) {
      router.push('/login')
    }
  }, [authLoading, supabaseUser, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Einstellungen' }]} />

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Einstellungen
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Waehl aus, was du bearbeiten moechtest.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/settings/account"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Passwort aendern und Kontodetails ansehen.
            </p>
          </Link>

          <Link
            href="/settings/appearance"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Ansicht</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Hell, dunkel oder Systemstandard waehlen.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
