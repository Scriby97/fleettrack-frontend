'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { applyTheme, getStoredTheme, setStoredTheme, type ThemePreference } from '@/lib/theme'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'
import Breadcrumbs from '@/app/components/Breadcrumbs'

export default function SettingsAppearancePage() {
  const router = useRouter()
  const { supabaseUser, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()

  const [themePreference, setThemePreference] = useState<ThemePreference>('system')

  useEffect(() => {
    if (!authLoading && !supabaseUser) {
      router.push('/login')
    }
  }, [authLoading, supabaseUser, router])

  useEffect(() => {
    setThemePreference(getStoredTheme())
  }, [])

  const handleThemeChange = (preference: ThemePreference) => {
    setThemePreference(preference)
    setStoredTheme(preference)
    applyTheme(preference)
    showToast('Ansicht gespeichert', 'success')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Einstellungen', href: '/settings' },
            { label: 'Ansicht' },
          ]}
        />

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Ansicht
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Waehle zwischen Systemstandard, dunklem oder hellem Modus.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Ansicht">
            <button
              type="button"
              role="radio"
              aria-checked={themePreference === 'system'}
              onClick={() => handleThemeChange('system')}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                themePreference === 'system'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="text-sm font-semibold">Systemstandard</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Folgt deinem Geraet</div>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={themePreference === 'dark'}
              onClick={() => handleThemeChange('dark')}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                themePreference === 'dark'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="text-sm font-semibold">Dunkel</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Schont die Augen</div>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={themePreference === 'light'}
              onClick={() => handleThemeChange('light')}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                themePreference === 'light'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="text-sm font-semibold">Hell</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Heller Hintergrund</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
