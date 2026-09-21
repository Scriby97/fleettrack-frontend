// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'
import { jsonResponse } from '@/test/http'

const authenticatedFetch = vi.fn()
vi.mock('@/lib/api/authenticatedFetch', () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args),
}))

const router = { push: vi.fn(), back: vi.fn() }
let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(search),
}))

const auth = { isAdmin: false }
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => auth }))

const orgState = {
  organizations: [
    { id: 'org-1', name: 'Bergbahnen AG' },
    { id: 'org-2', name: 'Andere AG' },
  ],
  selectedOrgId: 'org-1' as string | null,
  setSelectedOrgId: vi.fn(),
}
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ ...orgState }),
}))

// Kindkomponenten werden separat getestet - hier nur, wie die Uebersicht sie ansteuert.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let detailProps: any
vi.mock('./VehicleDetail', () => ({
  default: (props: { initialVehicle: { name: string } }) => {
    detailProps = props
    return <div data-testid="vehicle-detail">{props.initialVehicle.name}</div>
  },
}))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let exportProps: any
vi.mock('./ExportFleetCsvModal', () => ({
  default: (props: { onClose: () => void }) => {
    exportProps = props
    return (
      <div data-testid="export-modal">
        <button onClick={props.onClose}>close-export</button>
      </div>
    )
  },
}))

import FlottenUebersicht, { typeRank } from './vehicles'

// --- Helfer -----------------------------------------------------------------

const stat = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  vehicleId: id,
  name,
  plate: `BE ${id}`,
  ...extra,
})

function respondWith(body: unknown, status = 200) {
  authenticatedFetch.mockImplementation(() => Promise.resolve(jsonResponse(body, status)))
}

const vehicleNames = () =>
  screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent ?? '')

const groupHeadings = () =>
  screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')

describe('Flottenübersicht', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
    authenticatedFetch.mockReset()
    router.push.mockReset()
    router.back.mockReset()
    orgState.selectedOrgId = 'org-1'
    orgState.setSelectedOrgId.mockReset()
    auth.isAdmin = false
    search = ''
    detailProps = undefined
    exportProps = undefined
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('typeRank', () => {
    it('orders groomers first, generic/unknown types second, then quads and skidoos', () => {
      expect(typeRank('Pistenfahrzeug')).toBe(0)
      expect(typeRank('Transporter')).toBe(1)
      expect(typeRank(undefined)).toBe(1)
      expect(typeRank('Quad')).toBe(2)
      expect(typeRank('Skidoo')).toBe(3)
    })
  })

  describe('loading the fleet', () => {
    it('requests the stats of the selected organization', async () => {
      respondWith([stat('v1', 'Bully')])

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')

      expect(authenticatedFetch).toHaveBeenCalledTimes(1)
      const url = new URL(authenticatedFetch.mock.calls[0][0] as string)
      expect(url.pathname).toBe('/api/vehicles/stats')
      expect(url.searchParams.get('organizationId')).toBe('org-1')
      expect(url.searchParams.has('startDate')).toBe(false)
    })

    it('does not load anything before an organization is selected', () => {
      orgState.selectedOrgId = null

      renderWithIntl(<FlottenUebersicht />)

      expect(authenticatedFetch).not.toHaveBeenCalled()
    })

    it('shows a loading hint and then the count', async () => {
      let release!: () => void
      authenticatedFetch.mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            release = () => resolve(jsonResponse([stat('v1', 'A'), stat('v2', 'B')]))
          }),
      )

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByText('Lade Fahrzeuge...')).toBeInTheDocument()
      await act(async () => release())
      expect(await screen.findByText('2 Fahrzeuge in der Flotte')).toBeInTheDocument()
      expect(screen.queryByText('Lade Fahrzeuge...')).not.toBeInTheDocument()
    })

    it('shows an empty state without vehicles and offers no export', async () => {
      respondWith([])

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByText('Keine Fahrzeuge vorhanden')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'CSV exportieren' })).not.toBeInTheDocument()
    })

    it('shows an error when the server answers with an error status', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      respondWith({ message: 'boom' }, 500)

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByText('Fehler beim Laden der Fahrzeuge')).toBeInTheDocument()
      consoleError.mockRestore()
    })

    it('shows an error when the response has an unexpected shape', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      respondWith('nonsense')

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByText('Fehler beim Laden der Fahrzeuge')).toBeInTheDocument()
      consoleError.mockRestore()
    })

    it('also understands an object keyed by vehicle id', async () => {
      respondWith({ v1: { name: 'Objekt-Bully', plate: 'BE 1' } })

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByText('Objekt-Bully')).toBeInTheDocument()
    })

    it('reads alternative field names and falls back to a generated name', async () => {
      respondWith([
        { id: 'a1', vehicleName: 'Alias-Name', kennzeichen: 'ZH 99', SNOWsatNumber: '77', typ: 'Quad' },
        { id: 'a2' },
      ])

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByText('Alias-Name')).toBeInTheDocument()
      expect(screen.getByText('ZH 99')).toBeInTheDocument()
      expect(screen.getByText('77')).toBeInTheDocument()
      expect(screen.getByText('Fahrzeug a2')).toBeInTheDocument()
      // "typ" -> Quad-Gruppe
      expect(groupHeadings()).toContain('Quads')
    })

    it('aborts the running request when the organization changes', async () => {
      let firstSignal: AbortSignal | undefined
      authenticatedFetch.mockImplementationOnce((_url: string, options: { signal: AbortSignal }) => {
        firstSignal = options.signal
        return new Promise(() => {})
      })
      authenticatedFetch.mockImplementation(() => Promise.resolve(jsonResponse([stat('v9', 'Neu')])))
      const { rerender } = renderWithIntl(<FlottenUebersicht />)

      orgState.selectedOrgId = 'org-2'
      rerender(<FlottenUebersicht />)

      await screen.findByText('Neu')
      expect(firstSignal?.aborted).toBe(true)
      expect(new URL(authenticatedFetch.mock.calls[1][0] as string).searchParams.get('organizationId')).toBe('org-2')
    })
  })

  describe('grouping and sorting', () => {
    it('groups by type in a fixed order and skips empty groups', async () => {
      respondWith([
        stat('s', 'Ski', { vehicleType: 'Skidoo' }),
        stat('q', 'Quaddy', { vehicleType: 'Quad' }),
        stat('g', 'Bully', { vehicleType: 'Pistenfahrzeug' }),
        stat('t', 'Transi'),
      ])

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')

      expect(groupHeadings()).toEqual(['Pistenfahrzeuge', 'Transporter', 'Quads', 'Skidoos'])
    })

    it('omits a group without vehicles', async () => {
      respondWith([stat('g', 'Bully', { vehicleType: 'Pistenfahrzeug' })])

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')

      expect(groupHeadings()).toEqual(['Pistenfahrzeuge'])
    })

    it('sorts by SNOWsat number naturally and puts vehicles without a number last', async () => {
      respondWith([
        stat('a', 'Ohne Nummer', { vehicleType: 'Pistenfahrzeug' }),
        stat('b', 'Zehn', { vehicleType: 'Pistenfahrzeug', snowsatNumber: '10' }),
        stat('c', 'Zwei', { vehicleType: 'Pistenfahrzeug', snowsatNumber: '2' }),
      ])

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Zwei')

      expect(vehicleNames()).toEqual(['Zwei', 'Zehn', 'Ohne Nummer'])
    })

    it('shows number, plate and a retired marker', async () => {
      respondWith([
        stat('a', 'Alt', { snowsatNumber: '5', plate: 'BE 555', isRetired: true }),
        stat('b', 'Aktiv', { plate: 'BE 111' }),
      ])

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('BE 555')

      expect(screen.getByText('(Ausrangiert)')).toBeInTheDocument()
      expect(screen.getAllByText('(Ausrangiert)')).toHaveLength(1)
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('BE 111')).toBeInTheDocument()
    })
  })

  describe('organization selector', () => {
    it('is only shown for global administrators and changes the selection', async () => {
      respondWith([stat('v1', 'Bully')])
      auth.isAdmin = true

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')

      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: /Organi[sz]ation/ }),
        'org-2',
      )
      expect(orgState.setSelectedOrgId).toHaveBeenCalledWith('org-2')
    })

    it('is hidden for regular users', async () => {
      respondWith([stat('v1', 'Bully')])

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })
  })

  describe('vehicle detail', () => {
    it('navigates to the detail via the URL so that "back" works', async () => {
      respondWith([stat('v1', 'Bully')])
      renderWithIntl(<FlottenUebersicht />)

      await userEvent.click(await screen.findByRole('button', { name: /Bully/ }))

      expect(router.push).toHaveBeenCalledWith('/?vehicleId=v1')
    })

    it('shows the detail instead of the list when a known vehicleId is in the URL', async () => {
      respondWith([stat('v1', 'Bully'), stat('v2', 'Quaddy')])
      search = 'vehicleId=v2'

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByTestId('vehicle-detail')).toHaveTextContent('Quaddy')
      expect(screen.queryByText('Flottenübersicht')).not.toBeInTheDocument()
    })

    it('stays on the list when the vehicleId in the URL is unknown', async () => {
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=does-not-exist'

      renderWithIntl(<FlottenUebersicht />)

      expect(await screen.findByText('Bully')).toBeInTheDocument()
      expect(screen.queryByTestId('vehicle-detail')).not.toBeInTheDocument()
    })

    it('goes back in the browser history from the detail', async () => {
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')

      act(() => detailProps.onBack())

      expect(router.back).toHaveBeenCalledTimes(1)
    })

    it('reloads the list after a change', async () => {
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')
      expect(authenticatedFetch).toHaveBeenCalledTimes(1)

      act(() => detailProps.onChanged())

      await waitFor(() => expect(authenticatedFetch).toHaveBeenCalledTimes(2))
      expect(router.back).not.toHaveBeenCalled()
    })

    it('reloads the list and leaves the detail after a deletion', async () => {
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')

      act(() => detailProps.onDeleted())

      await waitFor(() => expect(authenticatedFetch).toHaveBeenCalledTimes(2))
      expect(router.back).toHaveBeenCalledTimes(1)
    })
  })

  describe('usage range shared with the detail and the export', () => {
    it('defaults to the last 12 months', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 8, 16, 12, 0))
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')

      expect(detailProps.rangeStart).toBe('2025-09-16T12:00')
      expect(detailProps.rangeEnd).toBe('2026-09-16T12:00')
    })

    it('restores a saved range from localStorage', async () => {
      window.localStorage.setItem(
        'fleettrack:vehicleRange',
        JSON.stringify({ start: '2026-01-01T00:00', end: '2026-01-31T23:59' }),
      )
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')

      await waitFor(() => expect(detailProps.rangeStart).toBe('2026-01-01T00:00'))
      expect(detailProps.rangeEnd).toBe('2026-01-31T23:59')
    })

    it('ignores a corrupt saved range', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 8, 16, 12, 0))
      window.localStorage.setItem('fleettrack:vehicleRange', '{not json')
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')

      expect(detailProps.rangeStart).toBe('2025-09-16T12:00')
    })

    it('ignores a saved range with the wrong shape', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 8, 16, 12, 0))
      window.localStorage.setItem('fleettrack:vehicleRange', JSON.stringify({ start: 1, end: 2 }))
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'

      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')

      expect(detailProps.rangeStart).toBe('2025-09-16T12:00')
    })

    it('persists a range change made in the detail and passes it on', async () => {
      respondWith([stat('v1', 'Bully')])
      search = 'vehicleId=v1'
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByTestId('vehicle-detail')

      act(() => detailProps.onRangeChange({ start: '2026-02-01T00:00', end: '2026-02-28T23:59' }))

      expect(detailProps.rangeStart).toBe('2026-02-01T00:00')
      expect(detailProps.rangeEnd).toBe('2026-02-28T23:59')
      expect(JSON.parse(window.localStorage.getItem('fleettrack:vehicleRange')!)).toEqual({
        start: '2026-02-01T00:00',
        end: '2026-02-28T23:59',
      })
    })
  })

  describe('CSV export entry points', () => {
    it('opens the export with the loaded vehicles, organization name and current range', async () => {
      respondWith([stat('v1', 'Bully')])
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')

      await userEvent.click(screen.getByRole('button', { name: 'CSV exportieren' }))

      expect(screen.getByTestId('export-modal')).toBeInTheDocument()
      expect(exportProps.vehicles.map((v: { name: string }) => v.name)).toEqual(['Bully'])
      expect(exportProps.organizationName).toBe('Bergbahnen AG')
      expect(exportProps.initialRangeStart).toBeTruthy()
      expect(exportProps.initialRangeEnd).toBeTruthy()
    })

    it('closes the export again', async () => {
      respondWith([stat('v1', 'Bully')])
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')
      await userEvent.click(screen.getByRole('button', { name: 'CSV exportieren' }))

      await userEvent.click(screen.getByRole('button', { name: 'close-export' }))

      expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument()
    })

    it('offers the export in the mobile actions menu, which closes on Escape', async () => {
      respondWith([stat('v1', 'Bully')])
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')
      const trigger = screen.getByRole('button', { name: 'Weitere Aktionen' })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('opens the export from the mobile menu and closes the menu', async () => {
      respondWith([stat('v1', 'Bully')])
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')
      await userEvent.click(screen.getByRole('button', { name: 'Weitere Aktionen' }))

      await userEvent.click(screen.getByRole('menuitem', { name: 'CSV exportieren' }))

      expect(screen.getByTestId('export-modal')).toBeInTheDocument()
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  describe('add vehicle button (mobile)', () => {
    it('is only rendered when a handler is given and calls it', async () => {
      respondWith([stat('v1', 'Bully')])
      const onAddVehicle = vi.fn()
      renderWithIntl(<FlottenUebersicht onAddVehicle={onAddVehicle} />)
      await screen.findByText('Bully')

      await userEvent.click(screen.getByRole('button', { name: 'Fahrzeug erfassen' }))

      expect(onAddVehicle).toHaveBeenCalledTimes(1)
    })

    it('is absent without a handler', async () => {
      respondWith([stat('v1', 'Bully')])
      renderWithIntl(<FlottenUebersicht />)
      await screen.findByText('Bully')

      expect(screen.queryByRole('button', { name: 'Fahrzeug erfassen' })).not.toBeInTheDocument()
    })
  })
})
