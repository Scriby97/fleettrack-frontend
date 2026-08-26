import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'
import type { OrganizationMemberDetail } from '@/lib/types/user'

/**
 * Alle Mitglieder einer Organisation (inkl. User-Daten).
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberDetail[]> {
  const response = await authenticatedFetch(
    buildApiUrl(`/organizations/${organizationId}/members`)
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Mitglieder' }))
    throw new Error(error.message || 'Fehler beim Laden der Mitglieder')
  }

  return response.json()
}

/**
 * Rolle eines Mitglieds ändern (Employee <-> Admin). Die Owner-Rolle kann
 * hierüber nicht gesetzt werden - dafür gibt es transferOwnership().
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  role: 'admin' | 'employee'
): Promise<OrganizationMemberDetail> {
  const response = await authenticatedFetch(
    buildApiUrl(`/organizations/${organizationId}/members/${memberId}`),
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Ändern der Rolle' }))
    throw new Error(error.message || 'Fehler beim Ändern der Rolle')
  }

  return response.json()
}

/**
 * Übergibt die eigene Owner-Rolle an ein anderes Mitglied - der bisherige
 * Owner wird dabei automatisch Admin. Nur der aktuelle Owner darf das.
 */
export async function transferOwnership(
  organizationId: string,
  newOwnerMemberId: string
): Promise<{ previousOwner: OrganizationMemberDetail; newOwner: OrganizationMemberDetail }> {
  const response = await authenticatedFetch(
    buildApiUrl(`/organizations/${organizationId}/transfer-ownership`),
    {
      method: 'POST',
      body: JSON.stringify({ newOwnerMemberId }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Übertragen der Owner-Rolle' }))
    throw new Error(error.message || 'Fehler beim Übertragen der Owner-Rolle')
  }

  return response.json()
}
