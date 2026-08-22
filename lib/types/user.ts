export interface Organization {
  id: string
  name: string
  subdomain?: string
  contactEmail?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type OrganizationRole = 'employee' | 'admin' | 'owner'
export type SubscriptionTier = 'lieutenant' | 'captain' | 'general'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled'

export interface OrganizationMembership {
  id: string
  userId: string
  organizationId: string
  organization?: Organization
  role: OrganizationRole
  joinedAt: string
}

export interface SubscriptionLimits {
  maxVehicles: number | null
  maxMembers: number | null
  priceChf: number
}

export interface OrganizationSubscription {
  id: string
  organizationId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodStart?: string
  currentPeriodEnd?: string
  canceledAt?: string
  createdAt: string
  updatedAt: string
  limits?: SubscriptionLimits
}

export interface PendingInvite {
  token: string
  role: OrganizationRole
  organization: {
    id: string
    name: string
  }
  expiresAt: string
}

export interface User {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
  organizationId: string | null
  organization: Organization | null
  organizationMemberships?: OrganizationMembership[]
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

export interface SelfServiceOrganizationRequest {
  name: string
  subdomain?: string
  contactEmail?: string
  tier: SubscriptionTier
}

export interface SelfServiceOrganizationResponse {
  organization: Organization
  subscription: OrganizationSubscription
  checkoutUrl: string | null
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
