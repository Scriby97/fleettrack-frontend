import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticatedFetch = vi.fn()
vi.mock('./authenticatedFetch', () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args),
}))

import { getUsagesWithVehicles } from './usages'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function requestedUrl(): URL {
  return new URL(authenticatedFetch.mock.calls[0][0] as string)
}

describe('getUsagesWithVehicles', () => {
  beforeEach(() => {
    authenticatedFetch.mockReset()
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
  })

  it('calls the with-vehicles endpoint without any params by default', async () => {
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ usages: [], nextCursor: null })),
    )

    await getUsagesWithVehicles()

    const url = requestedUrl()
    expect(url.pathname).toBe('/api/usages/with-vehicles')
    expect([...url.searchParams]).toEqual([])
  })

  it('sends organizationId, limit and cursor', async () => {
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ usages: [], nextCursor: null })),
    )

    await getUsagesWithVehicles('org-1', { limit: 10, cursor: 'abc' })

    const params = requestedUrl().searchParams
    expect(params.get('organizationId')).toBe('org-1')
    expect(params.get('limit')).toBe('10')
    expect(params.get('cursor')).toBe('abc')
  })

  it('sends startDate/endDate only when both are given', async () => {
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ usages: [], nextCursor: null })),
    )

    await getUsagesWithVehicles('org-1', { startDate: '2026-01-01T00:00:00.000Z' })
    expect(requestedUrl().searchParams.has('startDate')).toBe(false)
    expect(requestedUrl().searchParams.has('endDate')).toBe(false)

    authenticatedFetch.mockClear()
    await getUsagesWithVehicles('org-1', {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
    })
    expect(requestedUrl().searchParams.get('startDate')).toBe('2026-01-01T00:00:00.000Z')
    expect(requestedUrl().searchParams.get('endDate')).toBe('2026-01-31T00:00:00.000Z')
  })

  it('sends vehicleId when given', async () => {
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ usages: [], nextCursor: null })),
    )

    await getUsagesWithVehicles('org-1', { vehicleId: 'v1', limit: 10 })

    expect(requestedUrl().searchParams.get('vehicleId')).toBe('v1')
  })

  it('returns usages and the next cursor', async () => {
    authenticatedFetch.mockResolvedValue(
      jsonResponse({ usages: [{ id: 'u1' }], nextCursor: 'next' }),
    )

    const page = await getUsagesWithVehicles('org-1', { limit: 10 })

    expect(page).toEqual({ usages: [{ id: 'u1' }], nextCursor: 'next' })
  })

  it('defaults a missing nextCursor to null', async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse({ usages: [] }))

    const page = await getUsagesWithVehicles('org-1')

    expect(page.nextCursor).toBeNull()
  })

  it('suppresses the global loading indicator only when loading a follow-up page', async () => {
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ usages: [], nextCursor: null })),
    )

    await getUsagesWithVehicles('org-1', { limit: 10 })
    expect(authenticatedFetch.mock.calls[0][1]).toMatchObject({ skipLoadingIndicator: false })

    authenticatedFetch.mockClear()
    await getUsagesWithVehicles('org-1', { limit: 10, cursor: 'abc' })
    expect(authenticatedFetch.mock.calls[0][1]).toMatchObject({ skipLoadingIndicator: true })
  })

  it('passes the abort signal through', async () => {
    authenticatedFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ usages: [], nextCursor: null })),
    )
    const controller = new AbortController()

    await getUsagesWithVehicles('org-1', { signal: controller.signal })

    expect(authenticatedFetch.mock.calls[0][1]).toMatchObject({ signal: controller.signal })
  })

  it('throws on a non-ok response', async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse({ message: 'nope' }, { status: 500 }))

    await expect(getUsagesWithVehicles('org-1')).rejects.toThrow()
  })
})
