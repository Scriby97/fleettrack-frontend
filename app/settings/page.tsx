'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import Breadcrumbs from '@/app/components/Breadcrumbs'

export default function SettingsPage() {
  const router = useRouter()
  const { supabaseUser, loading: authLoading, isAdmin } = useAuth()
  const { canManageSelectedOrganization } = useOrganization()
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/settings/account"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('accountTitle')}</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t('accountDescription')}
            </p>
          </Link>

          <Link
            href="/settings/appearance"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('appearanceTitle')}</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t('appearanceDescription')}
            </p>
          </Link>

          <Link
            href="/settings/reminders"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('remindersTitle')}</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t('remindersDescription')}
            </p>
          </Link>

          {canManageSelectedOrganization && !isAdmin && (
            <Link
              href="/admin/users"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('userManagementTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('userManagementDescription')}
              </p>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin/all-users"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('allUsersTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('allUsersDescription')}
              </p>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin/organizations"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
            >
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('organizationsTitle')}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t('organizationsDescription')}
              </p>
            </Link>
          )}

          <Link
            href="/onboarding/create-organization"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
          >
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('createOrgTitle')}</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t('createOrgDescription')}
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
