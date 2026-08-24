import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'
import type { InviteInfo, InviteEntity, PendingInvite } from '@/lib/types/user'

/**
 * Get invite information by token (public endpoint - no auth required)
 */
export async function getInviteByToken(token: string): Promise<InviteInfo> {
  const response = await fetch(buildApiUrl(`/invites/${token}`))
  
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
  user: { id: string; email: string } | null
  session: { access_token: string; refresh_token: string; token_type?: string } | null
}> {
  const response = await fetch(buildApiUrl('/invites/accept'), {
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
  data: { email: string; role: 'admin' | 'employee' },
  organizationId?: string
): Promise<InviteEntity> {
  // organizationId in the body disambiguates which org to invite to - only
  // required if the user is admin/owner of more than one organization
  // (or is a global administrator, who must always specify one).
  const payload = organizationId ? { ...data, organizationId } : data

  const response = await authenticatedFetch(buildApiUrl('/organizations/invites'), {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Erstellen der Einladung' }))
    throw new Error(error.message || 'Fehler beim Erstellen der Einladung')
  }

  return response.json()
}

/**
 * Get invites for the given organization (or the user's own organization(s) if
 * omitted - only unambiguous when the user belongs to exactly one).
 */
export async function getOrganizationInvites(organizationId?: string): Promise<InviteEntity[]> {
  const url = new URL(buildApiUrl('/organizations/invites'))
  if (organizationId) {
    url.searchParams.set('organizationId', organizationId)
  }

  const response = await authenticatedFetch(url.toString())

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Einladungen' }))
    throw new Error(error.message || 'Fehler beim Laden der Einladungen')
  }

  return response.json()
}

/**
 * Get all pending invites addressed to the current authenticated user's email.
 */
export async function getMyInvites(): Promise<PendingInvite[]> {
  const response = await authenticatedFetch(buildApiUrl('/invites/mine'))

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Laden der Einladungen' }))
    throw new Error(error.message || 'Fehler beim Laden der Einladungen')
  }

  return response.json()
}

/**
 * Accept an invite as an already logged-in, existing user (no registration).
 */
export async function acceptInviteAsExistingUser(token: string): Promise<{ message: string }> {
  const response = await authenticatedFetch(buildApiUrl(`/invites/${token}/accept`), {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Annehmen der Einladung' }))
    throw new Error(error.message || 'Fehler beim Annehmen der Einladung')
  }

  return response.json()
}

/**
 * Decline an invite addressed to the current authenticated user.
 */
export async function declineInviteAsExistingUser(token: string): Promise<{ message: string }> {
  const response = await authenticatedFetch(buildApiUrl(`/invites/${token}/decline`), {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Ablehnen der Einladung' }))
    throw new Error(error.message || 'Fehler beim Ablehnen der Einladung')
  }

  return response.json()
}

/**
 * Delete an invite (requires authentication). The backend checks the invite's
 * organization against all organizations the user manages, so no explicit
 * organizationId is needed here (kept as a param for signature symmetry with
 * createInvite/getOrganizationInvites, in case that changes later).
 */
export async function deleteInvite(inviteId: string, _organizationId?: string): Promise<void> {
  const response = await authenticatedFetch(buildApiUrl(`/organizations/invites/${inviteId}`), {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Fehler beim Löschen der Einladung' }))
    throw new Error(error.message || 'Fehler beim Löschen der Einladung')
  }
}
