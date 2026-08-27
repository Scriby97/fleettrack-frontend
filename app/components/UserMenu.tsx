'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'
import { SUPPORTED_LOCALES, LOCALE_COOKIE_NAME, type AppLocale } from '@/i18n/request'

// Sprachnamen werden bewusst NICHT uebersetzt - ein Sprachumschalter zeigt
// jede Option immer in ihrer eigenen Sprache (Standard-UX-Konvention), nicht
// in der aktuell gewaehlten UI-Sprache.
const LANGUAGE_NAMES: Record<AppLocale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
}

const UserMenu: FC = () => {
  const { supabaseUser, userProfile, isAdmin, userRole, organization } = useAuth()
  const { organizations, selectedOrgId, setSelectedOrgId, selectedOrganizationRole } = useOrganization()
  const router = useRouter()
  const t = useTranslations('userMenu')
  const tCommon = useTranslations('common')
  const currentLocale = useLocale()

  if (!supabaseUser) return null

  const displayName = userProfile?.firstName && userProfile?.lastName
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : userProfile?.name || supabaseUser.user_metadata?.fullName || supabaseUser.email

  const getRoleDisplay = () => {
    if (isAdmin) return t('roleAdministrator')
    // Globale Rolle ist nur "Benutzer" - die eigentlich relevante Rolle ist die
    // in der aktuell ausgewählten Organisation (owner/admin/employee).
    if (selectedOrganizationRole === 'owner') return t('roleOwner')
    if (selectedOrganizationRole === 'admin') return t('roleAdmin')
    if (selectedOrganizationRole === 'employee') return t('roleEmployee')
    return t('roleUser')
  }

  const handleLanguageChange = (locale: AppLocale) => {
    // 1 Jahr, wie next-intl's eigenes Cookie-Beispiel - reine UI-Einstellung,
    // kein sensibler Wert.
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Organization Info / Switcher */}
      {organizations.length > 1 ? (
        <div className="pb-3 border-b border-zinc-200 dark:border-zinc-700">
          <label htmlFor="org-switcher" className="block text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            {tCommon('organizationLabel')}
          </label>
          <select
            id="org-switcher"
            value={selectedOrgId ?? ''}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full px-2 py-1.5 text-sm font-semibold border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      ) : organization ? (
        <div className="pb-3 border-b border-zinc-200 dark:border-zinc-700">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            {tCommon('organizationLabel')}
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-50">
            {organization.name}
          </div>
        </div>
      ) : null}

      {/* User Info */}
      <div className="text-sm">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">
          {displayName}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {supabaseUser.email}
        </div>
        {userRole && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
            {getRoleDisplay()}
          </div>
        )}
      </div>

      {/* Sprachumschalter */}
      <div className="pb-3 border-b border-zinc-200 dark:border-zinc-700">
        <label htmlFor="language-switcher" className="block text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
          {t('language')}
        </label>
        <select
          id="language-switcher"
          value={currentLocale}
          onChange={(e) => handleLanguageChange(e.target.value as AppLocale)}
          className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500"
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {LANGUAGE_NAMES[locale]}
            </option>
          ))}
        </select>
      </div>

      {/* Einstellungen (buendelt Account, Ansicht, User Management, Organizations je nach Rolle) */}
      <button
        onClick={() => router.push('/settings')}
        className="w-full px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg transition-colors text-left"
      >
        ⚙️ {t('settings')}
      </button>
    </div>
  )
}

export default UserMenu
