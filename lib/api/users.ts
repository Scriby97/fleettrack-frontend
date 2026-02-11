import { authenticatedFetch } from './authenticatedFetch'
import type { User } from '@/lib/types/user'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function getUsers(): Promise<User[]> {
  const response = await authenticatedFetch(`${API_URL}/auth/users`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Benutzer' }))
    throw new Error(error.message || 'Fehler beim Laden der Benutzer')
  }

  return response.json()
}

export async function sendUserResetPassword(userId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/auth/users/${userId}/reset-password`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Senden der Reset-Email' }))
    throw new Error(error.message || 'Fehler beim Senden der Reset-Email')
  }
}
