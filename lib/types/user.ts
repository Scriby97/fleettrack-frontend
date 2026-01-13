export interface Organization {
  id: string
  name: string
  subdomain?: string
}

export interface User {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
  organizationId: string
  organization: Organization
  firstName?: string
  lastName?: string
}

export interface InviteInfo {
  email: string
  role: 'admin' | 'user'
  organization: Organization
  expiresAt: string
}

export interface InviteEntity {
  id: string
  token: string
  email: string
  role: 'admin' | 'user'
  expiresAt: string
  usedAt: string | null
  usedBy: string | null
  invitedBy: string
  createdAt: string
  organizationId: string
}

export type InviteStatus = 'used' | 'pending' | 'expired'
