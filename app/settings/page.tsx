'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import { usePendingInvites } from '@/lib/contexts/PendingInvitesContext'
import Breadcrumbs from '@/app/components/Breadcrumbs'

export default function SettingsPage() {
  const router = useRouter()
  const { supabaseUser, loading: authLoading, isAdmin } = useAuth()
  const { canManageSelectedOrganization, selectedOrganizationRole } = useOrganization()
  const { pendingInvites, hasPendingInvites } = usePendingInvites()
  const t = useTranslations('settings')

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
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: t('title') }]} />

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        {/* Persoenlich: alles rund um den eigenen Account, unabhaengig von der Rolle */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('personalSectionTitle')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/settings/account"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              <span className="text-2xl" aria-hidden="true">👤</span>
              <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('accountTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('accountDescription')}
              </p>
            </Link>

            <Link
              href="/settings/appearance"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              <span className="text-2xl" aria-hidden="true">🎨</span>
              <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('appearanceTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('appearanceDescription')}
              </p>
            </Link>

            <Link
              href="/settings/reminders"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              <span className="text-2xl" aria-hidden="true">🔔</span>
              <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('remindersTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('remindersDescription')}
              </p>
            </Link>

            <Link
              href="/onboarding/invitations"
              className="relative rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              {hasPendingInvites && (
                <span className="absolute top-3 right-3 min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-yellow-400 text-zinc-900 text-xs font-semibold leading-none">
                  {pendingInvites.length}
                </span>
              )}
              <svg
                className="w-7 h-7 text-blue-600 dark:text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('invitationsTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('invitationsDescription')}
              </p>
            </Link>
          </div>
        </div>

        {/* Organisation: Mitgliederverwaltung der aktuell ausgewaehlten Organisation + neue Organisation gruenden */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('organizationSectionTitle')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {canManageSelectedOrganization && !isAdmin && (
              <Link
                href="/admin/users"
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
              >
                <span className="text-2xl" aria-hidden="true">👥</span>
                <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('userManagementTitle')}</div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {t('userManagementDescription')}
                </p>
              </Link>
            )}

            {selectedOrganizationRole === 'owner' && (
              <Link
                href="/settings/billing"
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
              >
                <span className="text-2xl" aria-hidden="true">💳</span>
                <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('billingTitle')}</div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {t('billingDescription')}
                </p>
              </Link>
            )}

            <Link
              href="/onboarding/create-organization"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              <span className="text-2xl" aria-hidden="true">🏢</span>
              <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('createOrgTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('createOrgDescription')}
              </p>
            </Link>
          </div>
        </div>

        {/* Administration: nur fuer globale Administratoren, daher bewusst zuunterst */}
        {isAdmin && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t('adminSectionTitle')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/admin/all-users"
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
              >
                <span className="text-2xl" aria-hidden="true">🗂️</span>
                <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('allUsersTitle')}</div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {t('allUsersDescription')}
                </p>
              </Link>

              <Link
                href="/admin/organizations"
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
              >
                <span className="text-2xl" aria-hidden="true">🏛️</span>
                <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('organizationsTitle')}</div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {t('organizationsDescription')}
                </p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
