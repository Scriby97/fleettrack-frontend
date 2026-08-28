'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Breadcrumbs from '@/app/components/Breadcrumbs'
import { createOrganization, getAllOrganizations } from '@/lib/api/organizations'
import { CreateOrganizationRequest, CreateOrganizationResponse, Organization, OrganizationRole } from '@/lib/types/user'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/app/components/Toast'
import { useDateLocale } from '@/lib/i18n/formatDate'
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage'

export default function AdminOrganizationsPage() {
  const { supabaseUser, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toasts, showToast, removeToast } = useToast()
  const t = useTranslations('adminOrganizations')
  const tCommon = useTranslations('common')
  const dateLocale = useDateLocale()
  const getApiErrorMessage = useApiErrorMessage()

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
    adminRole: 'owner',
    subdomain: '',
    contactEmail: '',
  })

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
      return
    }

    if (!authLoading && isAdmin) {
      loadOrganizations()
    }
  }, [authLoading, isAdmin, router])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const data = await getAllOrganizations()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations:', error)
      showToast(t('loadError'), 'error')
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
        adminRole: 'owner',
        subdomain: '',
        contactEmail: '',
      })

      // Reload organizations list
      loadOrganizations()
    } catch (error: unknown) {
      console.error('Fehler beim Erstellen der Organisation:', error)
      showToast(t('createErrorPrefix') + getApiErrorMessage(error, t('unknownError')), 'error')
    }
  }

  const handleCopyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      showToast(t('copyError'), 'error')
    }
  }

  const handleCreateEmailDraft = (result: CreateOrganizationResponse) => {
    const subject = encodeURIComponent(t('emailSubject', { orgName: result.organization.name }))
    const body = encodeURIComponent(
      `${t('emailGreeting')}\n\n` +
      `${t('emailInvitedLine', { orgName: result.organization.name })}\n\n` +
      `${t('emailLinkIntro')}\n` +
      `${result.invite.link}\n\n` +
      `${t('emailExpiryLine', { expiry: new Date(result.invite.expiresAt).toLocaleString(dateLocale) })}\n\n` +
      `${t('emailSignoff')}`
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

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: t('title') }]} />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('createButton')}
          </button>
        </div>

        {/* Organizations List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md">
          {/* Desktop Tabelle */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-100 dark:bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    {t('nameHeader')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    {t('subdomainHeader')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    {t('contactEmailHeader')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    {t('statusHeader')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                    {t('createdHeader')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      {t('noOrgsFound')}
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
                          {org.isActive ? t('activeLabel') : t('inactiveLabel')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(org.createdAt).toLocaleDateString(dateLocale)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Kacheln */}
          <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-700">
            {organizations.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                {t('noOrgsFound')}
              </div>
            ) : (
              organizations.map(org => (
                <div key={org.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 break-words">
                      {org.name}
                    </p>
                    <span className={`shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${
                      org.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {org.isActive ? t('activeLabel') : t('inactiveLabel')}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                    <p><span className="font-medium">{t('subdomainHeader')}:</span> {org.subdomain || '-'}</p>
                    <p className="break-all"><span className="font-medium">{t('contactEmailHeader')}:</span> {org.contactEmail || '-'}</p>
                    <p><span className="font-medium">{t('createdLabel')}</span> {new Date(org.createdAt).toLocaleDateString(dateLocale)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {t('modalTitle')}
                </h2>
                <button
                  onClick={closeCreateModal}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  aria-label={t('closeButton')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {!createdResult ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Organization Details */}
                <fieldset className="space-y-4">
                  <legend className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    {t('orgDetailsLegend')}
                  </legend>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('orgNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      minLength={2}
                      placeholder={t('orgNamePlaceholder')}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('subdomainOptionalLabel')}
                    </label>
                    <input
                      type="text"
                      value={formData.subdomain}
                      onChange={e => setFormData({ ...formData, subdomain: e.target.value })}
                      placeholder={t('subdomainPlaceholder')}
                      pattern="[a-z0-9-]+"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {t('subdomainHint')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('contactEmailOptionalLabel')}
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder={t('contactEmailPlaceholder')}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                  </div>
                </fieldset>

                {/* Admin User Details */}
                <fieldset className="space-y-4">
                  <legend className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    {t('adminUserLegend')}
                  </legend>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('adminEmailLabel')}
                    </label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                      required
                      placeholder={t('adminEmailPlaceholder')}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('firstNameOptionalLabel')}
                      </label>
                      <input
                        type="text"
                        value={formData.adminFirstName}
                        onChange={e => setFormData({ ...formData, adminFirstName: e.target.value })}
                        placeholder={t('firstNamePlaceholder')}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t('lastNameOptionalLabel')}
                      </label>
                      <input
                        type="text"
                        value={formData.adminLastName}
                        onChange={e => setFormData({ ...formData, adminLastName: e.target.value })}
                        placeholder={t('lastNamePlaceholder')}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t('roleInOrgLabel')}
                    </label>
                    <select
                      value={formData.adminRole}
                      onChange={e => setFormData({ ...formData, adminRole: e.target.value as OrganizationRole })}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    >
                      <option value="owner">{t('ownerOption')}</option>
                      <option value="admin">{t('adminOption')}</option>
                    </select>
                  </div>
                </fieldset>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {t('createSubmitButton')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-6">
                {/* Success Message */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                        {t('successTitle')}
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        {t('successBody')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Organization Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-zinc-900 dark:text-white">{t('orgDetailsTitle')}</h4>
                  <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('nameLabel')}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{createdResult.organization.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('idLabel')}</span>
                      <span className="text-sm font-mono text-zinc-900 dark:text-white">{createdResult.organization.id}</span>
                    </div>
                    {createdResult.organization.subdomain && (
                      <div className="flex justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('subdomainLabel')}</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{createdResult.organization.subdomain}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invite Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-zinc-900 dark:text-white">{t('inviteDetailsTitle')}</h4>
                  <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('emailLabel')}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{createdResult.invite.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('expiresLabel')}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {new Date(createdResult.invite.expiresAt).toLocaleString(dateLocale)}
                      </span>
                    </div>
                  </div>

                  {/* Invite Link Box */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {t('inviteLinkLabel')}
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
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                      >
                        {copiedId === 'created' ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('copiedLabel')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {t('copyButton')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleCreateEmailDraft(createdResult)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('emailDraftButton')}
                  </button>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={closeCreateModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {tCommon('close')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
