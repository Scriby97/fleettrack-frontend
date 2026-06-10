import {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  Organization,
  SelfServiceOrganizationRequest,
  SelfServiceOrganizationResponse,
} from '@/lib/types/user'
import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'

/**
 * Create a new organization (Super Admin only)
 */
export async function createOrganization(
  data: CreateOrganizationRequest
): Promise<CreateOrganizationResponse> {
  const response = await authenticatedFetch(buildApiUrl('/organizations'), {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Erstellen der Organisation' }))
    throw new Error(error.message || 'Fehler beim Erstellen der Organisation')
  }

  return response.json()
}

/**
 * Get all organizations (Super Admin only)
 */
export async function getAllOrganizations(): Promise<Organization[]> {
  const response = await authenticatedFetch(buildApiUrl('/organizations'))

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Organisationen' }))
    throw new Error(error.message || 'Fehler beim Laden der Organisationen')
  }

  return response.json()
}

/**
 * Create an organization for the current authenticated user.
 */
export async function createSelfServiceOrganization(
  data: SelfServiceOrganizationRequest
): Promise<SelfServiceOrganizationResponse> {
  const response = await authenticatedFetch(buildApiUrl('/organizations/self-service'), {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Erstellen der Organisation' }))
    throw new Error(error.message || 'Fehler beim Erstellen der Organisation')
  }

  return response.json()
}
