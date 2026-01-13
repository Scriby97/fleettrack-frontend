import { authenticatedFetch } from './authenticatedFetch'
import type { InviteInfo, InviteEntity } from '@/lib/types/user'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Get invite information by token (public endpoint - no auth required)
 */
export async function getInviteByToken(token: string): Promise<InviteInfo> {
  const response = await fetch(`${API_URL}/invites/${token}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Invalid or expired invite' }))
    throw new Error(error.message || 'Failed to fetch invite')
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
    const error = await response.json().catch(() => ({ message: 'Failed to accept invite' }))
    throw new Error(error.message || 'Failed to accept invite')
  }
  
  return response.json()
}

/**
 * Create a new invite for a user (requires authentication)
 * organizationId is automatically taken from the authenticated user
 */
export async function createInvite(
  data: { email: string; role: 'admin' | 'user' }
): Promise<InviteEntity> {
  const response = await authenticatedFetch(`${API_URL}/organizations/invites`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create invite' }))
    throw new Error(error.message || 'Failed to create invite')
  }
  
  return response.json()
}

/**
 * Get all invites for the authenticated user's organization (requires authentication)
 * organizationId is automatically taken from the authenticated user
 */
export async function getOrganizationInvites(): Promise<InviteEntity[]> {
  const response = await authenticatedFetch(`${API_URL}/organizations/invites`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch invites' }))
    throw new Error(error.message || 'Failed to fetch invites')
  }
  
  return response.json()
}

/**
 * Delete an invite (requires authentication)
 */
export async function deleteInvite(inviteId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/organizations/invites/${inviteId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete invite' }))
    throw new Error(error.message || 'Failed to delete invite')
  }
}
