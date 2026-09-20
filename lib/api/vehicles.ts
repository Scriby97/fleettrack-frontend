import { authenticatedFetch } from './authenticatedFetch'
import { buildApiUrl } from './url'
import { throwApiError } from './ApiError'

export interface UsageHistoryDay {
  date: string // 'YYYY-MM-DD'
  operatingHours: number
  fuelLiters: number
  usageCount: number
}

export interface VehicleUsageHistory {
  vehicle: {
    id: string
    name: string
    plate: string
    snowsatNumber?: string | null
    isRetired?: boolean
    location?: string | null
    vehicleType?: string | null
    fuelType?: string | null
    notes?: string | null
    organizationId: string
  }
  totals: {
    operatingHours: number
    fuelLiters: number
    firstHours: number | null
    lastHours: number | null
    usageCount: number
  }
  daily: UsageHistoryDay[]
}

/**
 * Usage history (totals + per-day buckets) for a single vehicle, optionally
 * restricted to a date range (by usageDate). Powers the vehicle detail view.
 */
export async function getVehicleUsageHistory(
  vehicleId: string,
  options: { startDate?: string; endDate?: string; signal?: AbortSignal } = {},
): Promise<VehicleUsageHistory> {
  const url = new URL(buildApiUrl(`/vehicles/${vehicleId}/usage-history`))
  if (options.startDate && options.endDate) {
    url.searchParams.set('startDate', options.startDate)
    url.searchParams.set('endDate', options.endDate)
  }

  const response = await authenticatedFetch(url.toString(), {
    signal: options.signal,
  })

  if (!response.ok) {
    await throwApiError(response, `HTTP ${response.status}`)
  }

  return response.json()
}

export interface OrganizationVehicle {
  id: string
  name: string
  plate?: string
  vehicleType?: string
}

/**
 * All active (not retired/archived) vehicles of an organization - independent
 * of whether they have any usages yet.
 */
export async function getOrganizationVehicles(
  organizationId: string,
  options: { signal?: AbortSignal } = {},
): Promise<OrganizationVehicle[]> {
  const url = new URL(buildApiUrl('/vehicles'))
  url.searchParams.set('organizationId', organizationId)

  const res = await authenticatedFetch(url.toString(), { signal: options.signal })
  if (!res.ok) {
    await throwApiError(res, `HTTP ${res.status}`)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response format')
  }
  return data as OrganizationVehicle[]
}
