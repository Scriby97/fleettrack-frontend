'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { createOrganization, getAllOrganizations } from '@/lib/api/organizations'
import { CreateOrganizationRequest, CreateOrganizationResponse, Organization } from '@/lib/types/user'

export default function SuperAdminOrganizationsPage() {
  const { supabaseUser, isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createdResult, setCreatedResult] = useState<CreateOrganizationResponse | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<CreateOrganizationRequest>({
    name: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminRole: 'admin',
    subdomain: '',
    contactEmail: '',
  })

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push('/')
      return
    }

    if (!authLoading && isSuperAdmin) {
      loadOrganizations()
    }
  }, [authLoading, isSuperAdmin, router])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const data = await getAllOrganizations()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations:', error)
      alert('Fehler beim Laden der Organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const result = await createOrganization(formData)
      setCreatedResult(result)
      
      // Reset form
      setFormData({
        name: '',
        adminEmail: '',
        adminFirstName: '',
        adminLastName: '',
        adminRole: 'admin',
        subdomain: '',
        contactEmail: '',
      })
      
      // Reload organizations list
      loadOrganizations()
    } catch (error: any) {
      console.error('Failed to create organization:', error)
      alert('Fehler beim Erstellen der Organization: ' + (error.message || 'Unbekannter Fehler'))
    }
  }

  const handleCopyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleCreateEmailDraft = (result: CreateOrganizationResponse) => {
    const subject = encodeURIComponent(`Einladung zu ${result.organization.name}`)
    const body = encodeURIComponent(
      `Hallo,\n\n` +
      `Sie wurden als Administrator für die Organization "${result.organization.name}" eingeladen.\n\n` +
      `Bitte klicken Sie auf den folgenden Link, um Ihr Konto zu erstellen:\n` +
      `${result.invite.link}\n\n` +
      `Der Link ist gültig bis ${new Date(result.invite.expiresAt).toLocaleString('de-DE')}.\n\n` +
      `Mit freundlichen Grüßen\n` +
      `FleetTrack Team`
    )
    window.location.href = `mailto:${result.invite.email}?subject=${subject}&body=${body}`
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreatedResult(null)
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
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <span className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400">
              Organizations
            </span>
          </nav>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Organizations
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Verwalten Sie alle Organizations
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Neue Organization
          </button>
        </div>

        {/* Organizations List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-100 dark:bg-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Subdomain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Kontakt-Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                  Erstellt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Keine Organizations vorhanden.
                  </td>
                </tr>
              ) : (
                organizations.map(org => (
                  <tr key={org.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {org.subdomain || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {org.contactEmail || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        org.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {org.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(org.createdAt).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Neue Organization erstellen
                </h2>
                <button
                  onClick={closeCreateModal}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {!createdResult ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Organization Details */}
                <fieldset className="space-y-4">
                  <legend className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    Organization Details
                  </legend>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      minLength={2}
                      placeholder="z.B. Acme Transportation GmbH"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Subdomain (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.subdomain}
                      onChange={e => setFormData({ ...formData, subdomain: e.target.value })}
                      placeholder="z.B. acme"
                      pattern="[a-z0-9-]+"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Nur Kleinbuchstaben, Zahlen und Bindestriche
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Kontakt-Email (optional)
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="info@firma.com"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                  </div>
                </fieldset>

                {/* Admin User Details */}
                <fieldset className="space-y-4">
                  <legend className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    Erster Admin-User
                  </legend>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                      required
                      placeholder="admin@firma.com"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Vorname (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.adminFirstName}
                        onChange={e => setFormData({ ...formData, adminFirstName: e.target.value })}
                        placeholder="Max"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Nachname (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.adminLastName}
                        onChange={e => setFormData({ ...formData, adminLastName: e.target.value })}
                        placeholder="Mustermann"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Admin Rolle
                    </label>
                    <select
                      value={formData.adminRole}
                      onChange={e => setFormData({ ...formData, adminRole: e.target.value as 'admin' | 'super_admin' })}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    >
                      <option value="admin">Admin (Standard)</option>
                      <option value="super_admin">Super Admin (volle Rechte)</option>
                    </select>
                  </div>
                </fieldset>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Organization erstellen
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-6">
                {/* Success Message */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">✅</span>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                        Organization erfolgreich erstellt!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Die Organization wurde angelegt und ein Invite für den Admin wurde generiert.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Organization Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-zinc-900 dark:text-white">Organization Details:</h4>
                  <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Name:</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{createdResult.organization.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">ID:</span>
                      <span className="text-sm font-mono text-zinc-900 dark:text-white">{createdResult.organization.id}</span>
                    </div>
                    {createdResult.organization.subdomain && (
                      <div className="flex justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Subdomain:</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{createdResult.organization.subdomain}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invite Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-zinc-900 dark:text-white">Admin Invite:</h4>
                  <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Email:</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{createdResult.invite.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Läuft ab:</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {new Date(createdResult.invite.expiresAt).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </div>

                  {/* Invite Link Box */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Invite-Link (an Admin senden):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={createdResult.invite.link}
                        readOnly
                        onClick={e => (e.target as HTMLInputElement).select()}
                        className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-sm font-mono"
                      />
                      <button
                        onClick={() => handleCopyLink(createdResult.invite.link, 'created')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                      >
                        {copiedId === 'created' ? '✓ Kopiert' : '📋 Kopieren'}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleCreateEmailDraft(createdResult)}
                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors font-medium"
                  >
                    📧 Email-Entwurf erstellen
                  </button>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={closeCreateModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Schließen
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
