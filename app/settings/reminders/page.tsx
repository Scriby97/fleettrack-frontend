'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'
import Breadcrumbs from '@/app/components/Breadcrumbs'
import {
  getReminderSettings,
  updateReminderSettings,
  getVapidPublicKey,
  registerPushSubscription,
} from '@/lib/api/notifications'
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage'

// Push-Server erwarten den VAPID Public Key als Uint8Array, Browser liefern ihn
// aber nur als base64url-String - Standard-Konvertierung dafuer.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function SettingsRemindersPage() {
  const router = useRouter()
  const { supabaseUser, loading: authLoading } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  const t = useTranslations('settingsReminders')
  const tSettings = useTranslations('settings')
  const getApiErrorMessage = useApiErrorMessage()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [time, setTime] = useState('20:00')
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (!authLoading && !supabaseUser) {
      router.push('/login')
    }
  }, [authLoading, supabaseUser, router])

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    )
  }, [])

  useEffect(() => {
    if (authLoading || !supabaseUser) return

    const load = async () => {
      try {
        const settings = await getReminderSettings()
        setEnabled(settings.enabled)
        setTime(settings.reminderTime)
      } catch (err) {
        const message = getApiErrorMessage(err, t('loadError'))
        showToast(message, 'error')
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, supabaseUser])

  const ensurePushSubscription = async () => {
    if (Notification.permission === 'denied') {
      throw new Error(t('permissionBlockedError'))
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error(t('permissionDeniedError'))
      }
    }

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const publicKey = await getVapidPublicKey()
      if (!publicKey) {
        throw new Error(t('notConfiguredError'))
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
    }

    await registerPushSubscription(subscription.toJSON() as PushSubscriptionJSON)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (enabled) {
        await ensurePushSubscription()
      }
      await updateReminderSettings(enabled, time)
      showToast(t('saveSuccess'), 'success')
    } catch (err) {
      const message = getApiErrorMessage(err, t('saveErrorGeneric'))
      showToast(message, 'error')
      if (enabled) {
        // Aktivieren ist fehlgeschlagen (z.B. Berechtigung verweigert) - Toggle
        // zuruecksetzen, damit UI und tatsaechlicher Zustand nicht auseinanderlaufen.
        setEnabled(false)
      }
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
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
            { label: tSettings('title'), href: '/settings' },
            { label: tSettings('remindersTitle') },
          ]}
        />

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 space-y-6">
          {!supported ? (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {t('unsupportedMessage')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {t('enableLabel')}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t('enableHint')}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={t('enableLabel')}
                  onClick={() => setEnabled((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
                    enabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label htmlFor="reminderTime" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('timeLabel')}
                </label>
                <input
                  id="reminderTime"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  disabled={!enabled}
                  className="w-full sm:w-48 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('saving') : t('saveButton')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
