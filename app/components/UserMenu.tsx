'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import { usePendingInvites } from '@/lib/contexts/PendingInvitesContext'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

const UserMenu: FC = () => {
  const { supabaseUser, userProfile, isAdmin, userRole, organization } = useAuth()
  const { organizations, selectedOrgId, setSelectedOrgId, selectedOrganizationRole } = useOrganization()
  const { pendingInvites, hasPendingInvites } = usePendingInvites()
  const router = useRouter()
  const t = useTranslations('userMenu')
  const tCommon = useTranslations('common')

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

      {/* Einstellungen (buendelt Account, Ansicht inkl. Sprache, User Management, Organizations je nach Rolle) */}
      <button
        onClick={() => router.push('/settings')}
        className="relative w-full px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg transition-colors text-left"
      >
        ⚙️ {t('settings')}
        {hasPendingInvites && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-green-500 text-white text-[11px] font-semibold leading-none">
            {pendingInvites.length}
          </span>
        )}
      </button>
    </div>
  )
}

export default UserMenu
