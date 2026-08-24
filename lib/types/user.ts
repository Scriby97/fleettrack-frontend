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
  // Globale, funktionale Rolle - nur diese zwei Werte existieren serverseitig.
  // "administrator" ist ausschliesslich für Entwickler-Accounts gedacht (kann
  // organisationsübergreifend auf alle Daten zugreifen); es gibt keine
  // separate "super_admin"-Stufe.
  role: 'user' | 'administrator'
  organizationId: string | null
  organization: Organization | null
  organizationMemberships?: OrganizationMembership[]
  firstName?: string
  lastName?: string
  name?: string
}

export interface InviteInfo {
  email: string
  role: OrganizationRole
  organization: Organization
  expiresAt: string
}

export interface InviteEntity {
  id: string
  token: string
  email: string
  role: OrganizationRole
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
  // null when checkoutUrl is set: for a paid tier, the organization isn't created
  // yet - it only gets created once the Stripe payment succeeds (webhook).
  organization: Organization | null
  subscription: OrganizationSubscription | null
  checkoutUrl: string | null
}

export type InviteStatus = 'used' | 'pending' | 'expired'

// Organization Management Types
export interface CreateOrganizationRequest {
  name: string
  adminEmail: string
  adminFirstName?: string
  adminLastName?: string
  // Organisationsrolle (nicht die globale User-Rolle!), die der eingeladene
  // Erst-Admin in der NEUEN Organisation bekommt.
  adminRole?: OrganizationRole
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
