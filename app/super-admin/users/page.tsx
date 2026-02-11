'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { getUsers, sendUserResetPassword } from '@/lib/api/users'
import { getAllOrganizations } from '@/lib/api/organizations'
import type { Organization, User } from '@/lib/types/user'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'

export default function SuperAdminUsersPage() {
  const router = useRouter()
  const { loading: authLoading, isSuperAdmin } = useAuth()
  const { toasts, showToast, removeToast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [confirmUser, setConfirmUser] = useState<User | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Super Admin User Management
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Alle Benutzer verwalten
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

          <div className="overflow-x-auto">
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
