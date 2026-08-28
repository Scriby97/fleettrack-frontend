import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'
import { throwApiError } from './ApiError'

export async function updatePassword(newPassword: string): Promise<void> {
  const response = await authenticatedFetch(buildApiUrl('/auth/update-password'), {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })

  if (!response.ok) {
    await throwApiError(response, 'Fehler beim Aktualisieren des Passworts')
  }
}
