'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createInvite, deleteInvite, getOrganizationInvites } from '@/lib/api/invites'
import { getUsers, sendUserResetPassword } from '@/lib/api/users'
import { getAllOrganizations } from '@/lib/api/organizations'
import type { InviteEntity, InviteStatus, Organization, User } from '@/lib/types/user'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'
import Breadcrumbs from '@/app/components/Breadcrumbs'

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

export default function SuperAdminUsersPage() {
  const router = useRouter()
  const { loading: authLoading, isSuperAdmin } = useAuth()
  const { toasts, showToast, removeToast } = useToast()

  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [confirmUser, setConfirmUser] = useState<User | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [invites, setInvites] = useState<InviteEntity[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [invitesError, setInvitesError] = useState<string | null>(null)
  const [inviteOrgId, setInviteOrgId] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push('/')
      return
    }

    if (!authLoading && isSuperAdmin) {
      const loadData = async () => {
        try {
          setLoading(true)
          const [orgData, userData] = await Promise.all([
            getAllOrganizations(),
            getUsers(),
          ])
          setOrganizations(orgData)
          setUsers(userData)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Fehler beim Laden der Daten'
          setError(message)
        } finally {
          setLoading(false)
        }
      }

      loadData()
    }
  }, [authLoading, isSuperAdmin, router])

  useEffect(() => {
    if (authLoading || !isSuperAdmin || activeTab !== 'invites' || !inviteOrgId) return

    const fetchInvites = async () => {
      try {
        setInvitesLoading(true)
        setInvitesError(null)
        const data = await getOrganizationInvites(inviteOrgId)
        setInvites(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Laden der Einladungen'
        setInvitesError(message)
      } finally {
        setInvitesLoading(false)
      }
    }

    fetchInvites()
  }, [authLoading, activeTab, inviteOrgId, isSuperAdmin])

  const filteredUsers = useMemo(() => {
    let result = users

    if (selectedOrgId) {
      result = result.filter((user) => user.organizationId === selectedOrgId)
    }

    const term = searchTerm.trim().toLowerCase()
    if (!term) return result

    return result.filter((user) => {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim().toLowerCase()
      const orgName = user.organization?.name?.toLowerCase() ?? ''
      return (
        user.email.toLowerCase().includes(term) ||
        name.includes(term) ||
        user.role.toLowerCase().includes(term) ||
        orgName.includes(term)
      )
    })
  }, [searchTerm, selectedOrgId, users])

  const getDisplayName = (user: User) => {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    return name || user.email
  }

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

  const sortedInvites = useMemo(() => {
    return [...invites].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [invites])

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setInvitesError(null)

    if (!inviteOrgId) {
      setInvitesError('Bitte zuerst eine Organization waehlen')
      return
    }

    const email = inviteEmail.trim()
    if (!email) {
      setInvitesError('Bitte eine Email-Adresse eingeben')
      return
    }

    setInviteSubmitting(true)
    try {
      const invite = await createInvite({ email, role: inviteRole }, inviteOrgId)
      setInvites((prev) => [invite, ...prev])
      setCreatedInviteLink(inviteLinkForToken(invite.token))
      setInviteEmail('')
      setInviteRole('user')
      showToast('Einladung erstellt', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen der Einladung'
      setInvitesError(message)
      showToast(message, 'error')
    } finally {
      setInviteSubmitting(false)
    }
  }

  const handleCopyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Kopieren'
      setInvitesError(message)
    }
  }

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await deleteInvite(inviteId, inviteOrgId)
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Loeschen der Einladung'
      setInvitesError(message)
    }
  }

  const handleCloseInviteModal = () => {
    setShowInviteModal(false)
    setCreatedInviteLink(null)
    setInviteEmail('')
    setInviteRole('user')
  }

  const handleResetRequest = (user: User) => {
    setConfirmUser(user)
  }

  const handleConfirmReset = async () => {
    if (!confirmUser) return

    setSubmittingId(confirmUser.id)
    try {
      await sendUserResetPassword(confirmUser.id)
      showToast(`Reset Email gesendet an ${confirmUser.email}`, 'success')
      setConfirmUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Senden der Reset-Email'
      showToast(message, 'error')
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

  if (!isSuperAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'User Management' }]} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Super Admin User Management
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Benutzer verwalten und Einladungen erstellen
            </p>
          </div>
          {activeTab === 'invites' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              + Einladung erstellen
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>

        {activeTab === 'users' && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 sm:p-6 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Benutzer</h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{filteredUsers.length}</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={selectedOrgId}
                  onChange={(event) => setSelectedOrgId(event.target.value)}
                  className="w-full sm:w-56 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm dark:bg-zinc-700 dark:text-zinc-100"
                >
                  <option value="">Alle Organizations</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Suche nach Name oder Email"
                  className="w-full sm:w-64 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Desktop Tabelle */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Rolle</th>
                    <th className="px-4 py-3 text-left font-medium">Organization</th>
                    <th className="px-4 py-3 text-left font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
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
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {user.organization?.name ?? '-'}
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

            {/* Mobile Kacheln */}
            <div className="md:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 dark:text-zinc-400">
                  Keine Benutzer gefunden.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {getDisplayName(user)}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 break-all">
                        {user.email}
                      </p>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p className="capitalize">
                        <span className="font-medium">Rolle:</span> {user.role.replace('_', ' ')}
                      </p>
                      <p>
                        <span className="font-medium">Organization:</span> {user.organization?.name ?? '-'}
                      </p>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={() => handleResetRequest(user)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        disabled={submittingId === user.id}
                      >
                        {submittingId === user.id ? 'Sende...' : 'Passwort-Reset senden'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 sm:p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Einladungen</h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{sortedInvites.length}</span>
              </div>
              <select
                value={inviteOrgId}
                onChange={(event) => setInviteOrgId(event.target.value)}
                className="w-full sm:w-64 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">Organization waehlen</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {invitesError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{invitesError}</p>
              </div>
            )}

            {!inviteOrgId && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 p-4 text-sm text-zinc-600 dark:text-zinc-300">
                Bitte waehle eine Organization, um Einladungen zu sehen oder zu erstellen.
              </div>
            )}

            {inviteOrgId && (
              <>
                {invitesLoading ? (
                  <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">Lade Einladungen...</div>
                ) : (
                  <>
                    {/* Desktop Tabelle */}
                    <div className="hidden md:block overflow-x-auto">
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

                    {/* Mobile Kacheln */}
                    <div className="md:hidden space-y-3">
                      {sortedInvites.length === 0 ? (
                        <div className="py-6 text-center text-zinc-500 dark:text-zinc-400">
                          Keine Einladungen gefunden.
                        </div>
                      ) : (
                        sortedInvites.map((invite) => {
                          const status = getInviteStatus(invite)
                          const link = inviteLinkForToken(invite.token)
                          const isCopyDisabled = !link

                          return (
                            <div
                              key={invite.id}
                              className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                    {invite.email}
                                  </p>
                                  <p className="text-sm text-zinc-600 dark:text-zinc-400 capitalize mt-1">
                                    Rolle: {invite.role}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${STATUS_CLASSES[status]}`}>
                                  {STATUS_LABELS[status]}
                                </span>
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium">Ablauf:</span> {new Date(invite.expiresAt).toLocaleDateString('de-DE')}
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
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
                            </div>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

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

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Neue Einladung
              </h2>
              <button
                onClick={handleCloseInviteModal}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Organization
                  </label>
                  <select
                    value={inviteOrgId}
                    onChange={(event) => setInviteOrgId(event.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-700 dark:text-zinc-100"
                  >
                    <option value="">Bitte waehlen</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                  disabled={inviteSubmitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {inviteSubmitting ? 'Erstelle...' : 'Einladung erstellen'}
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
                  onClick={handleCloseInviteModal}
                  className="w-full px-4 py-2 bg-zinc-900 dark:bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-600 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
