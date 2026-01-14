import { CreateOrganizationRequest, CreateOrganizationResponse, Organization } from '@/lib/types/user'
import { authenticatedFetch } from './authenticatedFetch'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/**
 * Create a new organization (Super Admin only)
 */
export async function createOrganization(
  data: CreateOrganizationRequest
): Promise<CreateOrganizationResponse> {
  const response = await authenticatedFetch(`${API_URL}/organizations`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create organization' }))
    throw new Error(error.message || 'Failed to create organization')
  }

  return response.json()
}

/**
 * Get all organizations (Super Admin only)
 */
export async function getAllOrganizations(): Promise<Organization[]> {
  const response = await authenticatedFetch(`${API_URL}/organizations`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch organizations' }))
    throw new Error(error.message || 'Failed to fetch organizations')
  }

  return response.json()
}
