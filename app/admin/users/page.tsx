'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/app/components/Breadcrumbs'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createInvite, deleteInvite, getOrganizationInvites } from '@/lib/api/invites'
import { getUsers, sendUserResetPassword } from '@/lib/api/users'
import type { InviteEntity, InviteStatus, User } from '@/lib/types/user'

const STATUS_LABELS: Record<InviteStatus, string> = {
  pending: 'Ausstehend',
  used: 'Eingeloest',
  expired: 'Abgelaufen',
}

const STATUS_CLASSES: Record<InviteStatus, string> = {
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  used: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  expired: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
}

export default function UsersPage() {
  const router = useRouter()
  const { loading: authLoading, isAdmin, isSuperAdmin, organization } = useAuth()

  const [activeTab, setActiveTab] = useState<'invites' | 'users'>('invites')
  const [invites, setInvites] = useState<InviteEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [resetNotice, setResetNotice] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmUser, setConfirmUser] = useState<User | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
      return
    }

    if (!authLoading && isSuperAdmin) {
      router.push('/super-admin/users')
      return
    }
  }, [authLoading, isAdmin, isSuperAdmin, router])

  useEffect(() => {
    if (authLoading || !isAdmin || isSuperAdmin) return

    const fetchData = async () => {
      setLoading(true)

      const [inviteResult, userResult] = await Promise.allSettled([
        getOrganizationInvites(),
        getUsers(),
      ])

      if (inviteResult.status === 'fulfilled') {
        setInvites(inviteResult.value)
      } else {
        const message = inviteResult.reason instanceof Error
          ? inviteResult.reason.message
          : 'Fehler beim Laden der Einladungen'
        setError(message)
      }

      if (userResult.status === 'fulfilled') {
        setUsers(userResult.value)
      } else {
        const message = userResult.reason instanceof Error
          ? userResult.reason.message
          : 'Fehler beim Laden der Benutzer'
        setUsersError(message)
      }

      setLoading(false)
    }

    fetchData()
  }, [authLoading, isAdmin, isSuperAdmin])

  const getInviteStatus = (invite: InviteEntity): InviteStatus => {
    if (invite.usedAt) return 'used'
    const expiresAt = new Date(invite.expiresAt).getTime()
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return 'expired'
    return 'pending'
  }

  const inviteLinkForToken = (token: string) => {
    if (!origin) return ''
    return `${origin}/invite/${token}`
  }

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const email = inviteEmail.trim()
    if (!email) {
      setError('Bitte eine Email-Adresse eingeben')
      return
    }

    setSubmitting(true)
    try {
      const invite = await createInvite({ email, role: inviteRole })
      setInvites((prev) => [invite, ...prev])
      setCreatedInviteLink(inviteLinkForToken(invite.token))
      setInviteEmail('')
      setInviteRole('user')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen der Einladung'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Kopieren'
      setError(message)
    }
  }

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await deleteInvite(inviteId)
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Loeschen der Einladung'
      setError(message)
    }
  }

  const handleCloseModal = () => {
    setShowInviteModal(false)
    setCreatedInviteLink(null)
    setInviteEmail('')
    setInviteRole('user')
  }

  const sortedInvites = useMemo(() => {
    return [...invites].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [invites])

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return users

    return users.filter((user) => {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim().toLowerCase()
      return (
        user.email.toLowerCase().includes(term) ||
        name.includes(term) ||
        user.role.toLowerCase().includes(term)
      )
    })
  }, [searchTerm, users])

  const getDisplayName = (user: User) => {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    return name || user.email
  }

  const handleResetRequest = (user: User) => {
    setConfirmUser(user)
  }

  const handleConfirmReset = async () => {
    if (!confirmUser) return

    setSubmittingId(confirmUser.id)
    setResetNotice(null)
    setUsersError(null)

    try {
      await sendUserResetPassword(confirmUser.id)
      setResetNotice(`Reset Email gesendet an ${confirmUser.email}`)
      setConfirmUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Senden der Reset-Email'
      setUsersError(message)
    } finally {
      setSubmittingId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin || isSuperAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'User Management' }]} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              User Management
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Organisation: {organization?.name}
            </p>
          </div>
          {activeTab === 'invites' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                + Einladung erstellen
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
              activeTab === 'invites'
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100'
                : 'border-zinc-200 text-zinc-600 hover:border-blue-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-blue-600'
            }`}
          >
            Einladungen
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100'
                : 'border-zinc-200 text-zinc-600 hover:border-blue-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-blue-600'
            }`}
          >
            Benutzer
          </button>
        </div>

        {activeTab === 'invites' && (
          <>
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Einladungen</h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{sortedInvites.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Rolle</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Ablauf</th>
                      <th className="px-4 py-3 text-left font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {sortedInvites.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                          Keine Einladungen gefunden.
                        </td>
                      </tr>
                    ) : (
                      sortedInvites.map((invite) => {
                        const status = getInviteStatus(invite)
                        const link = inviteLinkForToken(invite.token)
                        const isCopyDisabled = !link

                        return (
                          <tr key={invite.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                            <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                              {invite.email}
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 capitalize">
                              {invite.role}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_CLASSES[status]}`}>
                                {STATUS_LABELS[status]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                              {new Date(invite.expiresAt).toLocaleDateString('de-DE')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleCopyLink(link, invite.id)}
                                  disabled={isCopyDisabled}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {copiedId === invite.id ? 'Kopiert' : 'Link kopieren'}
                                </button>
                                {status === 'pending' && (
                                  <button
                                    onClick={() => handleDeleteInvite(invite.id)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                                  >
                                    Loeschen
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <>
            {usersError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{usersError}</p>
              </div>
            )}

            {resetNotice && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">{resetNotice}</p>
              </div>
            )}

            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 sm:p-6 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Benutzer</h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{filteredUsers.length}</span>
                </div>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Suche nach Name oder Email"
                  className="w-full sm:w-64 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Rolle</th>
                      <th className="px-4 py-3 text-left font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                          Keine Benutzer gefunden.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                          <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                            {getDisplayName(user)}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {user.email}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 capitalize">
                            {user.role.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleResetRequest(user)}
                              className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              disabled={submittingId === user.id}
                            >
                              {submittingId === user.id ? 'Sende...' : 'Passwort-Reset senden'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Neue Einladung
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Rolle
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as 'admin' | 'user')}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-700 dark:text-zinc-100"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Erstelle...' : 'Einladung erstellen'}
                </button>
              </form>

              {createdInviteLink && (
                <div className="mt-6 space-y-3">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Invite Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdInviteLink}
                      className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-mono"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(createdInviteLink, 'created')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {copiedId === 'created' ? 'Kopiert' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full px-4 py-2 bg-zinc-900 dark:bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-600 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Reset Email senden
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Reset Email an <span className="font-medium">{confirmUser.email}</span> senden?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmUser(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  disabled={submittingId === confirmUser.id}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  disabled={submittingId === confirmUser.id}
                >
                  {submittingId === confirmUser.id ? 'Sende...' : 'Reset senden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
