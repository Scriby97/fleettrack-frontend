import { authenticatedFetch } from './authenticatedFetch'
import type { InviteInfo, InviteEntity } from '@/lib/types/user'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Get invite information by token (public endpoint - no auth required)
 */
export async function getInviteByToken(token: string): Promise<InviteInfo> {
  const response = await fetch(`${API_URL}/invites/${token}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Ungültige oder abgelaufene Einladung' }))
    throw new Error(error.message || 'Fehler beim Laden der Einladung')
  }
  
  return response.json()
}

/**
 * Accept an invite and create a new user account
 */
export async function acceptInvite(data: {
  token: string
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<{
  message: string
  user: any
  session: any
}> {
  const response = await fetch(`${API_URL}/invites/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Annehmen der Einladung' }))
    throw new Error(error.message || 'Fehler beim Annehmen der Einladung')
  }
  
  return response.json()
}

/**
 * Create a new invite for a user (requires authentication)
 * organizationId is automatically taken from the authenticated user
 */
export async function createInvite(
  data: { email: string; role: 'admin' | 'user' },
  organizationId?: string
): Promise<InviteEntity> {
  const response = await authenticatedFetch(`${API_URL}/organizations/invites`, {
    method: 'POST',
    headers: organizationId ? { 'X-Organization-Id': organizationId } : undefined,
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Erstellen der Einladung' }))
    throw new Error(error.message || 'Fehler beim Erstellen der Einladung')
  }
  
  return response.json()
}

/**
 * Get all invites for the authenticated user's organization (requires authentication)
 * organizationId is automatically taken from the authenticated user
 */
export async function getOrganizationInvites(organizationId?: string): Promise<InviteEntity[]> {
  const response = await authenticatedFetch(`${API_URL}/organizations/invites`, {
    headers: organizationId ? { 'X-Organization-Id': organizationId } : undefined,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Einladungen' }))
    throw new Error(error.message || 'Fehler beim Laden der Einladungen')
  }
  
  return response.json()
}

/**
 * Delete an invite (requires authentication)
 */
export async function deleteInvite(inviteId: string, organizationId?: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/organizations/invites/${inviteId}`, {
    method: 'DELETE',
    headers: organizationId ? { 'X-Organization-Id': organizationId } : undefined,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Löschen der Einladung' }))
    throw new Error(error.message || 'Fehler beim Löschen der Einladung')
  }
}
