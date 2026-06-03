import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'

export async function updatePassword(newPassword: string): Promise<void> {
  const response = await authenticatedFetch(buildApiUrl('/auth/update-password'), {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Aktualisieren des Passworts' }))
    throw new Error(error.message || 'Fehler beim Aktualisieren des Passworts')
  }
}
