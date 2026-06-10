export interface Organization {
  id: string
  name: string
  subdomain?: string
  contactEmail?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
  organizationId: string | null
  organization: Organization | null
  firstName?: string
  lastName?: string
  name?: string
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

export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise'

export interface SelfServiceOrganizationRequest {
  name: string
  contactEmail: string
  description?: string
  plan: SubscriptionPlan
}

export interface SelfServiceOrganizationResponse {
  organization: Organization
  subscription: {
    plan: SubscriptionPlan
    status: 'active' | 'trial' | 'pending'
    maxVehicles: number
    maxUsers: number
  }
  checkoutUrl?: string
}

export type InviteStatus = 'used' | 'pending' | 'expired'

// Organization Management Types
export interface CreateOrganizationRequest {
  name: string
  adminEmail: string
  adminFirstName?: string
  adminLastName?: string
  adminRole?: 'admin' | 'super_admin'
  subdomain?: string
  contactEmail?: string
}

export interface CreateOrganizationResponse {
  organization: Organization
  invite: {
    token: string
    link: string
    email: string
    expiresAt: string
  }
}
