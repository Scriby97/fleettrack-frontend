'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { 
  getOrganizationInvites, 
  createInvite, 
  deleteInvite 
} from '@/lib/api/invites'
import type { InviteEntity, InviteStatus } from '@/lib/types/user'

export default function UsersPage() {
  const { loading: authLoading, isAdmin, isSuperAdmin, organizationId, organization } = useAuth()
  const router = useRouter()
  
  const [invites, setInvites] = useState<InviteEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
    }
  }, [authLoading, isAdmin, router])

  // Fetch invites
  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const data = await getOrganizationInvites()
        setInvites(data)
      } catch (err) {
        'use client'

        import { useEffect, useMemo, useState } from 'react'
        import { useRouter } from 'next/navigation'
        import { useAuth } from '@/lib/auth/AuthProvider'
        import { getUsers, sendUserResetPassword } from '@/lib/api/users'
        import type { User } from '@/lib/types/user'
        import { useToast } from '@/lib/hooks/useToast'
        import { ToastContainer } from '@/app/components/Toast'

        export default function AdminUsersPage() {
          const router = useRouter()
          const { loading: authLoading, isAdmin, isSuperAdmin, organization } = useAuth()
          const { toasts, showToast, removeToast } = useToast()

          const [users, setUsers] = useState<User[]>([])
          const [loading, setLoading] = useState(true)
          const [error, setError] = useState<string | null>(null)
          const [searchTerm, setSearchTerm] = useState('')
          const [confirmUser, setConfirmUser] = useState<User | null>(null)
          const [submittingId, setSubmittingId] = useState<string | null>(null)

          useEffect(() => {
            if (!authLoading && !isAdmin) {
              router.push('/')
              return
            }

            if (!authLoading && isSuperAdmin) {
              router.push('/super-admin/users')
              return
            }

            if (!authLoading && isAdmin && !isSuperAdmin) {
              const loadUsers = async () => {
                try {
                  setLoading(true)
                  const data = await getUsers()
                  setUsers(data)
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Fehler beim Laden der Benutzer'
                  setError(message)
                } finally {
                  setLoading(false)
                }
              }

              loadUsers()
            }
          }, [authLoading, isAdmin, isSuperAdmin, router])

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

          if (!isAdmin || isSuperAdmin) {
            return null
          }

          return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-8">
              <ToastContainer toasts={toasts} onRemove={removeToast} />
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      User Management
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                      Benutzer verwalten fuer {organization?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/')}
                    className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    ← Dashboard
                  </button>
                </div>

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

                  {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  )}

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
            </div>
          )
        }
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
                      onClick={handleCopyCreatedLink}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      {copiedId === 'created' ? (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full px-4 py-2 bg-zinc-900 dark:bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
