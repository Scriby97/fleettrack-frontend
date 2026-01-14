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
        console.error('Failed to fetch invites:', err)
        setError(err instanceof Error ? err.message : 'Failed to load invites')
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      fetchInvites()
    }
  }, [isAdmin])

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setError(null)
    setSubmitting(true)
    
    try {
      const newInvite = await createInvite({
        email: inviteEmail,
        role: inviteRole,
      })
      
      setInvites(prev => [newInvite, ...prev])
      
      // Show invite link in modal (using query parameter format)
      const inviteLink = `${window.location.origin}/invite/accept?token=${newInvite.token}`
      setCreatedInviteLink(inviteLink)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to delete this invite?')) return
    
    try {
      await deleteInvite(inviteId)
      setInvites(prev => prev.filter(invite => invite.id !== inviteId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete invite')
    }
  }

  const handleCopyLink = async (token: string, inviteId: string) => {
    const inviteLink = `${window.location.origin}/invite/accept?token=${token}`
    await navigator.clipboard.writeText(inviteLink)
    setCopiedId(inviteId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCloseModal = () => {
    setShowInviteModal(false)
    setError(null)
    setInviteEmail('')
    setInviteRole('user')
    setCreatedInviteLink(null)
  }

  const handleCopyCreatedLink = async () => {
    if (createdInviteLink) {
      await navigator.clipboard.writeText(createdInviteLink)
      setCopiedId('created')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const getInviteStatus = (invite: InviteEntity): InviteStatus => {
    // Wurde bereits verwendet
    if (invite.usedAt !== null) {
      return 'used'
    }
    
    // Ist abgelaufen
    const now = new Date()
    const expiresAt = new Date(invite.expiresAt)
    if (expiresAt < now) {
      return 'expired'
    }
    
    // Ist noch gültig
    return 'pending'
  }

  const getStatusBadge = (invite: InviteEntity) => {
    const status = getInviteStatus(invite)
    
    if (status === 'used') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Verwendet
        </span>
      )
    }
    
    if (status === 'expired') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Abgelaufen
        </span>
      )
    }
    
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
        Ausstehend
      </span>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <nav className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              ← Dashboard
            </button>
            <span className="text-zinc-300 dark:text-zinc-600">|</span>
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => router.push('/admin/organizations')}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Organizations
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
              </>
            )}
            <span className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              User Management
            </span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            User Management
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage invitations for {organization?.name}
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite User
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {copiedId && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              Invite link copied to clipboard!
            </p>
          </div>
        )}

        {/* Invites Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-100 dark:bg-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Rolle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No invites yet. Click "Invite User" to get started.
                  </td>
                </tr>
              ) : (
                invites.map(invite => (
                  <tr key={invite.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {invite.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                      {invite.role}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getStatusBadge(invite)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {getInviteStatus(invite) === 'used' && invite.usedAt ? (
                        <div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-500">Verwendet am:</div>
                          <div>{new Date(invite.usedAt).toLocaleString('de-DE')}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-500">Läuft ab am:</div>
                          <div>{new Date(invite.expiresAt).toLocaleString('de-DE')}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getInviteStatus(invite) === 'pending' && (
                          <button
                            onClick={() => handleCopyLink(invite.token, invite.id)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                            title="Copy invite link"
                          >
                            {copiedId === invite.id ? 'Kopiert!' : 'Link kopieren'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteInvite(invite.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                          title="Delete invite"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Invite New User
            </h2>
            
            {!createdInviteLink ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Create Invite'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Success Message */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                        Invite Created Successfully!
                      </h3>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Share this link with the new user to let them join your organization.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invite Link Display */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
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
