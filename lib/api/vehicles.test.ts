import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticatedFetch = vi.fn()
vi.mock('./authenticatedFetch', () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args),
}))

import { getOrganizationVehicles, getInconsistentVehicleIds } from './vehicles'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('getOrganizationVehicles', () => {
  beforeEach(() => {
    authenticatedFetch.mockReset()
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
  })

  it('requests the vehicles of the given organization', async () => {
    authenticatedFetch.mockResolvedValue(json([{ id: 'v1', name: 'Bully' }]))

    const vehicles = await getOrganizationVehicles('org-1')

    const url = new URL(authenticatedFetch.mock.calls[0][0] as string)
    expect(url.pathname).toBe('/api/vehicles')
    expect(url.searchParams.get('organizationId')).toBe('org-1')
    expect(vehicles).toEqual([{ id: 'v1', name: 'Bully' }])
  })

  it('rejects an unexpected (non-array) response', async () => {
    authenticatedFetch.mockResolvedValue(json({ oops: true }))

    await expect(getOrganizationVehicles('org-1')).rejects.toThrow('Unexpected response format')
  })

  it('throws on a non-ok response', async () => {
    authenticatedFetch.mockResolvedValue(json({ message: 'nope' }, 403))

    await expect(getOrganizationVehicles('org-1')).rejects.toThrow()
  })
})

describe('getInconsistentVehicleIds', () => {
  beforeEach(() => {
    authenticatedFetch.mockReset()
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
  })

  it('requests the endpoint without organizationId by default', async () => {
    authenticatedFetch.mockResolvedValue(json({ vehicleIds: ['v1'] }))

    const ids = await getInconsistentVehicleIds()

    const url = new URL(authenticatedFetch.mock.calls[0][0] as string)
    expect(url.pathname).toBe('/api/vehicles/inconsistent-usages')
    expect(url.searchParams.has('organizationId')).toBe(false)
    expect(ids).toEqual(['v1'])
  })

  it('sends organizationId when given', async () => {
    authenticatedFetch.mockResolvedValue(json({ vehicleIds: [] }))

    await getInconsistentVehicleIds('org-1')

    const url = new URL(authenticatedFetch.mock.calls[0][0] as string)
    expect(url.searchParams.get('organizationId')).toBe('org-1')
  })

  it('defaults a missing vehicleIds field to an empty array', async () => {
    authenticatedFetch.mockResolvedValue(json({}))

    const ids = await getInconsistentVehicleIds('org-1')

    expect(ids).toEqual([])
  })

  it('throws on a non-ok response', async () => {
    authenticatedFetch.mockResolvedValue(json({ message: 'nope' }, 500))

    await expect(getInconsistentVehicleIds('org-1')).rejects.toThrow()
  })
})
