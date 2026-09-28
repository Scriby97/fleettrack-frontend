'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth/AuthProvider'
import { usePendingInvites } from '@/lib/contexts/PendingInvitesContext'

export default function OnboardingPage() {
  const router = useRouter()
  const { userProfile, hasOrganization, signOut, supabaseUser } = useAuth()
  const { pendingInvites, hasPendingInvites } = usePendingInvites()
  const t = useTranslations('onboarding')

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    if (userProfile && hasOrganization) {
      router.replace('/')
    }
  }, [userProfile, hasOrganization, router])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-10 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <div className="flex items-center justify-end gap-3 mb-6 text-sm">
          {supabaseUser?.email && (
            <span className="text-zinc-500 dark:text-zinc-400 truncate">{supabaseUser.email}</span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="shrink-0 font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('signOutButton')}
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{t('title')}</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            href="/onboarding/create-organization"
            className="group rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('option1Label')}</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t('createOrgTitle')}</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t('createOrgDescription')}
            </p>
            <div className="mt-6 text-blue-600 dark:text-blue-400 font-medium">{t('createOrgCta')}</div>
          </Link>

          <Link
            href="/onboarding/invitations"
            className="group relative rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            {hasPendingInvites && (
              <span className="absolute top-3 right-3 min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-yellow-400 text-zinc-900 text-xs font-semibold leading-none">
                {pendingInvites.length}
              </span>
            )}
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('option2Label')}</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t('invitesTitle')}</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t('invitesDescription')}
            </p>
            <div className="mt-6 text-blue-600 dark:text-blue-400 font-medium">{t('invitesCta')}</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
