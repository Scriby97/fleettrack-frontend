import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'
import type { User } from '@/lib/types/user'

export async function getUsers(): Promise<User[]> {
  const response = await authenticatedFetch(buildApiUrl('/auth/users'))

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Benutzer' }))
    throw new Error(error.message || 'Fehler beim Laden der Benutzer')
  }

  return response.json()
}

export async function sendUserResetPassword(userId: string): Promise<void> {
  const response = await authenticatedFetch(buildApiUrl(`/auth/users/${userId}/reset-password`), {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Senden der Reset-Email' }))
    throw new Error(error.message || 'Fehler beim Senden der Reset-Email')
  }
}
