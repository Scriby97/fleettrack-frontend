// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const orgState = { selectedOrgId: 'org-1' as string | null }
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ ...orgState }),
}))

const getSession = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: (...args: unknown[]) => getSession(...args) } }),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastSseOptions: any
const fetchEventSource = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (_url: string, options: any) => {
    lastSseOptions = options
    // Simuliert eine offen bleibende Verbindung - loest sich in diesen Tests
    // nie auf, es sei denn der Test ruft options.onerror/onclose selbst auf.
    return new Promise(() => {})
  },
)
vi.mock('@microsoft/fetch-event-source', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchEventSource: (url: string, options: any) => fetchEventSource(url, options),
}))

import { DataFreshnessProvider, useDataFreshness } from './DataFreshnessContext'

function Probe() {
  const { dataVersion, markStale } = useDataFreshness()
  return (
    <div>
      <p data-testid="version">{dataVersion}</p>
      <button onClick={markStale}>mark-stale</button>
    </div>
  )
}

describe('DataFreshnessContext', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
    orgState.selectedOrgId = 'org-1'
    getSession.mockReset()
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } })
    fetchEventSource.mockClear()
    lastSseOptions = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('starts at version 0 and bumps it when markStale is called directly', async () => {
    render(
      <DataFreshnessProvider>
        <Probe />
      </DataFreshnessProvider>,
    )
    expect(screen.getByTestId('version').textContent).toBe('0')

    await userEvent.click(screen.getByRole('button', { name: 'mark-stale' }))

    expect(screen.getByTestId('version').textContent).toBe('1')
  })

  it('opens an SSE connection with the current auth token, scoped to the selected organization', async () => {
    render(
      <DataFreshnessProvider>
        <Probe />
      </DataFreshnessProvider>,
    )

    await waitFor(() => expect(fetchEventSource).toHaveBeenCalled())
    const [url, options] = fetchEventSource.mock.calls[0]
    expect(url).toBe('https://api.example.test/api/organizations/org-1/events')
    expect(options.headers.Authorization).toBe('Bearer token-abc')
  })

  it('does not open an SSE connection before an organization is selected', () => {
    orgState.selectedOrgId = null
    render(
      <DataFreshnessProvider>
        <Probe />
      </DataFreshnessProvider>,
    )

    expect(fetchEventSource).not.toHaveBeenCalled()
  })

  it('bumps dataVersion when the SSE stream delivers a "changed" event', async () => {
    render(
      <DataFreshnessProvider>
        <Probe />
      </DataFreshnessProvider>,
    )
    await waitFor(() => expect(fetchEventSource).toHaveBeenCalled())

    act(() => {
      lastSseOptions.onmessage({ data: JSON.stringify({ type: 'changed' }) })
    })

    expect(screen.getByTestId('version').textContent).toBe('1')
  })

  it('ignores "ping" heartbeat events from the SSE stream', async () => {
    render(
      <DataFreshnessProvider>
        <Probe />
      </DataFreshnessProvider>,
    )
    await waitFor(() => expect(fetchEventSource).toHaveBeenCalled())

    act(() => {
      lastSseOptions.onmessage({ data: JSON.stringify({ type: 'ping' }) })
    })

    expect(screen.getByTestId('version').textContent).toBe('0')
  })

  it('bumps dataVersion on the 2-minute fallback timer, independent of SSE', async () => {
    vi.useFakeTimers()
    render(
      <DataFreshnessProvider>
        <Probe />
      </DataFreshnessProvider>,
    )

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })

    expect(screen.getByTestId('version').textContent).toBe('1')
  })

  it('bumps dataVersion when the tab becomes visible again', () => {
    render(
      <DataFreshnessProvider>
        <Probe />
      </DataFreshnessProvider>,
    )

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(screen.getByTestId('version').textContent).toBe('1')
  })
})
