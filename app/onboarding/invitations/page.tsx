'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getMyInvites, acceptInviteAsExistingUser, declineInviteAsExistingUser } from '@/lib/api/invites'
import { useAuth } from '@/lib/auth/AuthProvider'
import type { PendingInvite } from '@/lib/types/user'

export default function OnboardingInvitationsPage() {
  const router = useRouter()
  const { refreshOrganizations } = useAuth()
  const t = useTranslations('onboardingInvitations')

  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingToken, setProcessingToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getMyInvites()
      .then((data) => {
        if (!cancelled) setInvites(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAccept = async (token: string) => {
    setError(null)
    setProcessingToken(token)
    try {
      await acceptInviteAsExistingUser(token)
      await refreshOrganizations()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('acceptError'))
      setProcessingToken(null)
    }
  }

  const handleDecline = async (token: string) => {
    setError(null)
    setProcessingToken(token)
    try {
      await declineInviteAsExistingUser(token)
      setInvites((prev) => prev.filter((invite) => invite.token !== token))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('declineError'))
    } finally {
      setProcessingToken(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-10 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div>
          <Link href="/onboarding" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            {t('backLink')}
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{t('title')}</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {!loading && invites.length === 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('noInvitesMessage')}
            </p>
            <Link href="/onboarding" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
              {t('backToOverview')}
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {invites.map((invite) => (
            <div
              key={invite.token}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {invite.organization.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t('roleLabel')} <span className="font-medium">{invite.role}</span>
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('expiresLabel')} {new Date(invite.expiresAt).toLocaleDateString()}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleAccept(invite.token)}
                  disabled={processingToken === invite.token}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingToken === invite.token ? t('accepting') : t('acceptButton')}
                </button>
                <button
                  onClick={() => handleDecline(invite.token)}
                  disabled={processingToken === invite.token}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('declineButton')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
