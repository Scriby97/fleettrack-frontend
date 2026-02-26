'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getInviteByToken, acceptInvite } from '@/lib/api/invites'
import type { InviteInfo } from '@/lib/types/user'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })
  
  const [isUnauthorized, setIsUnauthorized] = useState(false)

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const data = await getInviteByToken(token)
        setInvite(data)
        setFormData(prev => ({ ...prev, email: data.email }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ungültiger oder abgelaufener Einladungs-Link')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    
    if (formData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }
    
    setSubmitting(true)
    
    try {
      await acceptInvite({
        token,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })
      
      // Redirect to login page after successful registration
      router.push('/login?message=Konto erfolgreich erstellt! Bitte melde dich an.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Annehmen der Einladung'
      setError(errorMessage)
      // Check if the error is an UnauthorizedException
      if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('not authenticated') || errorMessage.toLowerCase().includes('nicht autorisiert') || errorMessage.toLowerCase().includes('nicht angemeldet')) {
        setIsUnauthorized(true)
      }
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading invite...</p>
        </div>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Invalid Invite</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4 py-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Join {invite?.organization.name}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Du wurdest eingeladen als <span className="font-semibold">{invite?.role}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-6 sm:p-8">
          {/* Invite Info */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>E-Mail:</strong> {invite?.email}
                </p>
                <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">
                  <strong>Läuft ab:</strong> {invite && new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                readOnly
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Vorname
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white text-zinc-900"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nachname
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white text-zinc-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white text-zinc-900"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Passwort bestätigen
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white text-zinc-900"
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <button
              type={isUnauthorized ? 'button' : 'submit'}
              disabled={submitting}
              onClick={isUnauthorized ? () => router.push('/login') : undefined}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnauthorized ? 'Zum Login' : (submitting ? 'Konto wird erstellt...' : 'Einladung annehmen & Konto erstellen')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
