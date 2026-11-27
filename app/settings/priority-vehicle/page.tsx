'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import { getOrganizationVehicles, type OrganizationVehicle } from '@/lib/api/vehicles'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'
import Breadcrumbs from '@/app/components/Breadcrumbs'
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage'

export default function SettingsPriorityVehiclePage() {
  const router = useRouter()
  const { supabaseUser, loading: authLoading } = useAuth()
  const { selectedOrgId, priorityVehicleId, setPriorityVehicleId } = useOrganization()
  const { toasts, showToast, removeToast } = useToast()
  const t = useTranslations('settingsPriorityVehicle')
  const tSettings = useTranslations('settings')
  const getApiErrorMessage = useApiErrorMessage()

  const [vehicles, setVehicles] = useState<OrganizationVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Lokale Auswahl, getrennt vom tatsaechlich gespeicherten Wert (priorityVehicleId) -
  // nur beim Laden/Organisationswechsel damit synchronisiert, siehe Effekt unten.
  const [selectedVehicleId, setSelectedVehicleId] = useState('')

  useEffect(() => {
    if (!authLoading && !supabaseUser) {
      router.push('/login')
    }
  }, [authLoading, supabaseUser, router])

  useEffect(() => {
    if (!selectedOrgId) return
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      try {
        const data = await getOrganizationVehicles(selectedOrgId, { signal: controller.signal })
        setVehicles(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        showToast(getApiErrorMessage(err, t('loadError')), 'error')
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId])

  // Lokale Auswahl auf den gespeicherten Wert zuruecksetzen, sobald er bekannt
  // ist oder sich die Organisation aendert - danach bleibt sie dem User
  // ueberlassen (kein erneutes Ueberschreiben bei jedem Re-Render).
  useEffect(() => {
    setSelectedVehicleId(priorityVehicleId ?? '')
  }, [priorityVehicleId, selectedOrgId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await setPriorityVehicleId(selectedVehicleId || null)
      showToast(t('saveSuccess'), 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, t('saveErrorGeneric')), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-900 px-4 pt-20 pb-24 md:pt-8 md:pb-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: tSettings('title'), href: '/settings' },
            { label: tSettings('priorityVehicleTitle') },
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
          {vehicles.length === 0 ? (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {t('noVehiclesMessage')}
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="priorityVehicleSelect" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('vehicleLabel')}
                </label>
                <select
                  id="priorityVehicleSelect"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full sm:w-80 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('noVehicleOption')}</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {t('hint')}
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-signal-600 text-white font-semibold rounded-lg hover:bg-signal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
