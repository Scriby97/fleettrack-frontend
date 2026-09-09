'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import {
  updateOrganizationProfile,
  uploadOrganizationLogo,
  deleteOrganizationLogo,
} from '@/lib/api/organizations'
import { resizeToSquareWebp, ImageValidationError } from '@/lib/images/resizeImage'
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'
import Breadcrumbs from '@/app/components/Breadcrumbs'
import { OrgAvatar } from '@/app/components/OrgAvatar'

export default function SettingsOrganizationPage() {
  const router = useRouter()
  const { supabaseUser, loading: authLoading, refreshOrganizations } = useAuth()
  const {
    organizations,
    selectedOrgId,
    selectedOrganizationRole,
    isLoading: orgLoading,
  } = useOrganization()
  const { toasts, showToast, removeToast } = useToast()
  const t = useTranslations('settingsOrganization')
  const tSettings = useTranslations('settings')
  const getApiErrorMessage = useApiErrorMessage()

  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  )
  const isOwner = selectedOrganizationRole === 'owner'

  const [name, setName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [logoBusy, setLogoBusy] = useState<'upload' | 'remove' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initializedOrgId = useRef<string | null>(null)

  // Nicht eingeloggt -> Login; eingeloggt aber kein Owner -> zurück zu Settings.
  useEffect(() => {
    if (authLoading || orgLoading) return
    if (!supabaseUser) {
      router.replace('/login')
      return
    }
    if (!isOwner) router.replace('/settings')
  }, [authLoading, orgLoading, supabaseUser, isOwner, router])

  // Namensfeld einmal pro Organisation vorbelegen (nicht bei jedem
  // refreshOrganizations, sonst würde die Eingabe überschrieben).
  useEffect(() => {
    if (selectedOrg && initializedOrgId.current !== selectedOrg.id) {
      initializedOrgId.current = selectedOrg.id
      setName(selectedOrg.name)
    }
  }, [selectedOrg])

  const handleNameSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedOrg) return
    setNameError(null)
    setNameSaving(true)
    try {
      await updateOrganizationProfile(selectedOrg.id, { name: name.trim() })
      await refreshOrganizations()
      showToast(t('nameUpdateSuccess'), 'success')
    } catch (err) {
      const message = getApiErrorMessage(err, t('nameErrorGeneric'))
      setNameError(message)
      showToast(message, 'error')
    } finally {
      setNameSaving(false)
    }
  }

  const handleFilePicked = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedOrg) return

    setLogoBusy('upload')
    try {
      const blob = await resizeToSquareWebp(file)
      await uploadOrganizationLogo(selectedOrg.id, blob)
      await refreshOrganizations()
      showToast(t('logoUpdateSuccess'), 'success')
    } catch (err) {
      let message: string
      if (err instanceof ImageValidationError) {
        message =
          err.message === 'unsupported-type'
            ? t('invalidImageType')
            : err.message === 'too-large'
              ? t('imageTooLarge')
              : t('imageProcessingFailed')
      } else {
        message = getApiErrorMessage(err, t('logoErrorGeneric'))
      }
      showToast(message, 'error')
    } finally {
      setLogoBusy(null)
    }
  }

  const handleLogoRemove = async () => {
    if (!selectedOrg) return
    setLogoBusy('remove')
    try {
      await deleteOrganizationLogo(selectedOrg.id)
      await refreshOrganizations()
      showToast(t('logoRemoveSuccess'), 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, t('logoErrorGeneric')), 'error')
    } finally {
      setLogoBusy(null)
    }
  }

  if (authLoading || orgLoading || !isOwner || !selectedOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const nameUnchanged = name.trim() === selectedOrg.name
  const nameTooShort = name.trim().length < 2

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: tSettings('title'), href: '/settings' },
            { label: t('title') },
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
          {/* Logo */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {t('logoSectionTitle')}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('logoSectionSubtitle')}
              </p>
            </div>

            <div className="flex items-center gap-5">
              <OrgAvatar
                name={selectedOrg.name}
                logoUrl={selectedOrg.logoUrl}
                size={80}
              />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoBusy !== null}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logoBusy === 'upload'
                      ? t('uploading')
                      : selectedOrg.logoUrl
                        ? t('replaceButton')
                        : t('chooseButton')}
                  </button>
                  {selectedOrg.logoUrl && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={logoBusy !== null}
                      className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {logoBusy === 'remove' ? t('removing') : t('removeButton')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t('logoHint')}
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFilePicked}
            />
          </section>

          {/* Name */}
          <section className="border-t border-zinc-200 dark:border-zinc-700 pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {t('nameSectionTitle')}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('nameSectionSubtitle')}
              </p>
            </div>

            <form onSubmit={handleNameSave} className="space-y-4">
              <div>
                <label
                  htmlFor="orgName"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  {t('nameLabel')}
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>

              {nameError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{nameError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={nameSaving || nameUnchanged || nameTooShort}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nameSaving ? t('saving') : t('saveButton')}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
