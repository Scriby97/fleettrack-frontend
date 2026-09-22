// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'

const getUsagesWithVehicles = vi.fn()
const getOrganizationVehicles = vi.fn()
const authenticatedFetch = vi.fn()

vi.mock('@/lib/api/usages', () => ({
  getUsagesWithVehicles: (...args: unknown[]) => getUsagesWithVehicles(...args),
}))
vi.mock('@/lib/api/vehicles', () => ({
  getOrganizationVehicles: (...args: unknown[]) => getOrganizationVehicles(...args),
}))
vi.mock('@/lib/api/authenticatedFetch', () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args),
}))

const auth = { isAdmin: false, userProfile: { id: 'me' } }
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => auth }))

const orgState = {
  organizations: [
    { id: 'org-1', name: 'Org 1' },
    { id: 'org-2', name: 'Org 2' },
  ],
  selectedOrgId: 'org-1' as string | null,
  setSelectedOrgId: vi.fn(),
  canManageSelectedOrganization: true,
}
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ ...orgState }),
}))

import UebersichtEintraege from './usages'

// --- Helfer -----------------------------------------------------------------

const vehicle = { id: 'v1', name: 'Pistenbully 1', plate: 'BE 1', vehicleType: 'Pistenfahrzeug' }

function makeUsage(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `u${n}`,
    vehicleId: 'v1',
    vehicle,
    startOperatingHours: 100 + n,
    endOperatingHours: 105 + n,
    fuelLitersRefilled: 50,
    usageDate: new Date(2026, 8, 16, 8, 0).toISOString(),
    creatorId: 'me',
    creator: { id: 'me', firstName: 'Nicolas', lastName: 'Balmer', email: 'n@example.test' },
    ...overrides,
  }
}

const usages = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => makeUsage(from + i))

const page = (items: unknown[], nextCursor: string | null) => ({ usages: items, nextCursor })

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// IntersectionObserver-Stub: die Tests loesen das Sichtbarwerden des
// Listenendes selbst aus.
interface FakeObserver {
  callback: IntersectionObserverCallback
  disconnected: boolean
}
let observers: FakeObserver[] = []

class IntersectionObserverStub {
  private readonly entry: FakeObserver
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, disconnected: false }
    observers.push(this.entry)
  }
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
  disconnect() {
    this.entry.disconnected = true
  }
}

const activeObservers = () => observers.filter((o) => !o.disconnected)

async function reachEndOfList() {
  // Der Beobachter wird in einem Effekt angelegt, der kurz nach dem Rendern der
  // Liste laeuft - darauf warten, statt sich auf das Timing zu verlassen.
  await waitFor(() => expect(activeObservers().length).toBeGreaterThan(0))
  const active = activeObservers()
  await act(async () => {
    active.at(-1)!.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

const cards = () => document.querySelectorAll('main h3, section h3')

function setDatetime(id: string, value: string) {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } })
}

describe('Übersicht Nutzungen', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
    observers = []
    getUsagesWithVehicles.mockReset()
    getOrganizationVehicles.mockReset()
    authenticatedFetch.mockReset()
    getOrganizationVehicles.mockResolvedValue([])
    orgState.selectedOrgId = 'org-1'
    orgState.canManageSelectedOrganization = true
    orgState.setSelectedOrgId.mockReset()
  })

  afterEach(() => {
    // Erst abbauen, dann die Attrappen entfernen - sonst kann ein noch laufender
    // Effekt ein IntersectionObserver-Objekt anlegen, das es nicht mehr gibt.
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('list pagination', () => {
    it('loads only the first page (10, newest first) without any date filter', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 10), 'c1'))

      renderWithIntl(<UebersichtEintraege />)

      expect(await screen.findByText('10 neueste Nutzungen angezeigt')).toBeInTheDocument()
      expect(getUsagesWithVehicles).toHaveBeenCalledTimes(1)
      const [orgId, options] = getUsagesWithVehicles.mock.calls[0]
      expect(orgId).toBe('org-1')
      expect(options).toMatchObject({ limit: 10 })
      expect(options.cursor).toBeUndefined()
      expect(options.startDate).toBeUndefined()
      expect(options.endDate).toBeUndefined()
      expect(cards()).toHaveLength(10)
    })

    it('does not show the loading hint or observe anything when everything fits on one page', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 3), null))

      renderWithIntl(<UebersichtEintraege />)

      expect(await screen.findByText('3 Nutzungen gefunden')).toBeInTheDocument()
      expect(screen.queryByText('Lade weitere Nutzungen…')).not.toBeInTheDocument()
      expect(activeObservers()).toHaveLength(0)
    })

    it('loads the next page with the cursor when the end of the list becomes visible', async () => {
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        .mockResolvedValueOnce(page(usages(10, 2), null))

      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')

      await reachEndOfList()

      await waitFor(() => expect(cards()).toHaveLength(12))
      expect(getUsagesWithVehicles).toHaveBeenCalledTimes(2)
      expect(getUsagesWithVehicles.mock.calls[1][1]).toMatchObject({ limit: 10, cursor: 'c1' })
      expect(screen.getByText('12 Nutzungen gefunden')).toBeInTheDocument()
    })

    it('stops loading once the last page has been reached', async () => {
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        .mockResolvedValueOnce(page(usages(10, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')
      await reachEndOfList()
      await screen.findByText('12 Nutzungen gefunden')

      expect(activeObservers()).toHaveLength(0)
      expect(screen.queryByText('Lade weitere Nutzungen…')).not.toBeInTheDocument()
      expect(getUsagesWithVehicles).toHaveBeenCalledTimes(2)
    })

    it('follows a chain of cursors across several pages', async () => {
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        .mockResolvedValueOnce(page(usages(10, 10), 'c2'))
        .mockResolvedValueOnce(page(usages(20, 5), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')

      await reachEndOfList()
      await waitFor(() => expect(cards()).toHaveLength(20))
      await reachEndOfList()
      await waitFor(() => expect(cards()).toHaveLength(25))

      expect(getUsagesWithVehicles.mock.calls.map((c) => c[1].cursor)).toEqual([
        undefined,
        'c1',
        'c2',
      ])
    })

    it('does not show an entry twice when it appears on two pages', async () => {
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        // u9 wurde inzwischen erneut geliefert (z.B. Datum nachtraeglich geaendert)
        .mockResolvedValueOnce(page([makeUsage(9), makeUsage(10)], null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')

      await reachEndOfList()

      await waitFor(() => expect(cards()).toHaveLength(11))
    })

    it('ignores repeated "end visible" signals while a page is still loading', async () => {
      const second = deferred<ReturnType<typeof page>>()
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        .mockReturnValueOnce(second.promise)
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')

      await reachEndOfList()
      expect(await screen.findByText('Lade weitere Nutzungen…')).toBeInTheDocument()
      // waehrend geladen wird ist der Observer abgehaengt - ein weiteres Signal darf nichts ausloesen
      expect(activeObservers()).toHaveLength(0)
      expect(getUsagesWithVehicles).toHaveBeenCalledTimes(2)

      await act(async () => {
        second.resolve(page(usages(10, 1), null))
      })
      await waitFor(() => expect(cards()).toHaveLength(11))
      expect(getUsagesWithVehicles).toHaveBeenCalledTimes(2)
    })

    it('pauses on a load-more error and only retries via the button', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(page(usages(10, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')

      await reachEndOfList()

      const retry = await screen.findByRole('button', { name: 'Mehr laden' })
      expect(screen.getByText('Fehler beim Laden der Nutzungen')).toBeInTheDocument()
      // die schon geladenen Eintraege bleiben stehen ...
      expect(cards()).toHaveLength(10)
      // ... und es wird nicht von selbst erneut versucht
      expect(activeObservers()).toHaveLength(0)
      expect(getUsagesWithVehicles).toHaveBeenCalledTimes(2)

      await userEvent.click(retry)

      await waitFor(() => expect(cards()).toHaveLength(12))
      expect(getUsagesWithVehicles.mock.calls[2][1]).toMatchObject({ cursor: 'c1' })
      consoleError.mockRestore()
    })

    it('shows an empty state when there are no usages', async () => {
      getUsagesWithVehicles.mockResolvedValue(page([], null))

      renderWithIntl(<UebersichtEintraege />)

      expect(await screen.findByText('Keine Nutzungen vorhanden')).toBeInTheDocument()
    })

    it('shows an error when the first page cannot be loaded', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      getUsagesWithVehicles.mockRejectedValue(new Error('boom'))

      renderWithIntl(<UebersichtEintraege />)

      expect(await screen.findByText('Fehler beim Laden der Nutzungen')).toBeInTheDocument()
      consoleError.mockRestore()
    })

    it('does not load anything before an organization is selected', () => {
      orgState.selectedOrgId = null

      renderWithIntl(<UebersichtEintraege />)

      expect(getUsagesWithVehicles).not.toHaveBeenCalled()
    })
  })

  describe('organization switch', () => {
    it('starts over with the first page of the new organization', async () => {
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        .mockResolvedValueOnce(page(usages(100, 2), null))
      const { rerender } = renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')

      orgState.selectedOrgId = 'org-2'
      rerender(<UebersichtEintraege />)

      await screen.findByText('2 Nutzungen gefunden')
      expect(getUsagesWithVehicles.mock.calls[1][0]).toBe('org-2')
      expect(getUsagesWithVehicles.mock.calls[1][1].cursor).toBeUndefined()
      expect(cards()).toHaveLength(2)
    })

    it('discards a late load-more response of the previous organization', async () => {
      const lateNextPage = deferred<ReturnType<typeof page>>()
      getUsagesWithVehicles
        .mockResolvedValueOnce(page(usages(0, 10), 'c1'))
        .mockReturnValueOnce(lateNextPage.promise)
        .mockResolvedValueOnce(
          page([makeUsage(200, { vehicle: { ...vehicle, name: 'Neuer Bully' } })], null),
        )
      const { rerender } = renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')
      await reachEndOfList()
      await screen.findByText('Lade weitere Nutzungen…')

      orgState.selectedOrgId = 'org-2'
      rerender(<UebersichtEintraege />)
      await screen.findByText('Neuer Bully')

      await act(async () => {
        lateNextPage.resolve(
          page([makeUsage(50, { vehicle: { ...vehicle, name: 'Alter Bully' } })], null),
        )
      })

      expect(screen.queryByText('Alter Bully')).not.toBeInTheDocument()
      expect(cards()).toHaveLength(1)
    })

    it('discards a late response of the previous organization', async () => {
      const oldOrg = deferred<ReturnType<typeof page>>()
      getUsagesWithVehicles
        .mockReturnValueOnce(oldOrg.promise)
        .mockResolvedValueOnce(page([makeUsage(200, { vehicle: { ...vehicle, name: 'Neuer Bully' } })], null))
      const { rerender } = renderWithIntl(<UebersichtEintraege />)

      orgState.selectedOrgId = 'org-2'
      rerender(<UebersichtEintraege />)
      await screen.findByText('Neuer Bully')

      await act(async () => {
        oldOrg.resolve(
          page([makeUsage(1, { vehicle: { ...vehicle, name: 'Alter Bully' } })], null),
        )
      })

      expect(screen.queryByText('Alter Bully')).not.toBeInTheDocument()
      expect(screen.getByText('Neuer Bully')).toBeInTheDocument()
    })
  })

  describe('optional date range filter', () => {
    it('starts collapsed, with an empty range that does not restrict the request', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))

      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')

      expect(screen.getByRole('button', { name: 'Zeitraum filtern' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      expect(document.getElementById('usagesRangeStart')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).not.toBeInTheDocument()
      const [, options] = getUsagesWithVehicles.mock.calls[0]
      expect(options.startDate).toBeUndefined()
      expect(options.endDate).toBeUndefined()
    })

    it('reveals the empty inputs when opened', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')

      await userEvent.click(screen.getByRole('button', { name: 'Zeitraum filtern' }))

      expect(document.getElementById('usagesRangeStart')).toHaveValue('')
      expect(document.getElementById('usagesRangeEnd')).toHaveValue('')
    })

    it('reloads the first page for the chosen range once start and end are set', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')
      await userEvent.click(screen.getByRole('button', { name: 'Zeitraum filtern' }))
      getUsagesWithVehicles.mockClear()

      setDatetime('usagesRangeStart', '2026-01-01T00:00')
      setDatetime('usagesRangeEnd', '2026-01-31T23:59')

      await waitFor(() => {
        const last = getUsagesWithVehicles.mock.calls.at(-1)![1]
        expect(last).toMatchObject({
          startDate: new Date('2026-01-01T00:00').toISOString(),
          endDate: new Date('2026-01-31T23:59').toISOString(),
          limit: 10,
        })
        expect(last.cursor).toBeUndefined()
      })
    })

    it('does not reload while only start or end is set (half-open range)', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')
      await userEvent.click(screen.getByRole('button', { name: 'Zeitraum filtern' }))
      getUsagesWithVehicles.mockClear()

      setDatetime('usagesRangeStart', '2026-01-01T00:00')
      await screen.findByRole('button', { name: 'Zurücksetzen' })

      // solange nur Start ODER Ende gesetzt ist, aendert sich an der Abfrage nichts
      expect(getUsagesWithVehicles).not.toHaveBeenCalled()
    })

    it('shows an error and does not fetch when start is after end', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')
      await userEvent.click(screen.getByRole('button', { name: 'Zeitraum filtern' }))
      getUsagesWithVehicles.mockClear()

      setDatetime('usagesRangeStart', '2026-02-01T00:00')
      setDatetime('usagesRangeEnd', '2026-01-01T00:00')

      expect(
        await screen.findByText('Das Startdatum muss vor dem Enddatum liegen.'),
      ).toBeInTheDocument()
      expect(getUsagesWithVehicles).not.toHaveBeenCalled()
    })

    it('shows a summary with a reset button once a range is active, even collapsed', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')
      await userEvent.click(screen.getByRole('button', { name: 'Zeitraum filtern' }))
      setDatetime('usagesRangeStart', '2026-01-01T00:00')
      setDatetime('usagesRangeEnd', '2026-01-31T23:59')
      await waitFor(() =>
        expect(getUsagesWithVehicles.mock.calls.at(-1)![1].startDate).toBeDefined(),
      )

      // Filter wieder einklappen - die Zusammenfassung und "Zurücksetzen" bleiben trotzdem sichtbar.
      await userEvent.click(screen.getByRole('button', { name: /Zeitraum:/ }))

      expect(document.getElementById('usagesRangeStart')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument()
    })

    it('"Zurücksetzen" clears the range and reloads without it', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')
      await userEvent.click(screen.getByRole('button', { name: 'Zeitraum filtern' }))
      setDatetime('usagesRangeStart', '2026-01-01T00:00')
      setDatetime('usagesRangeEnd', '2026-01-31T23:59')
      await waitFor(() =>
        expect(getUsagesWithVehicles.mock.calls.at(-1)![1].startDate).toBeDefined(),
      )

      await userEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))

      await waitFor(() => {
        expect(getUsagesWithVehicles.mock.calls.at(-1)![1].startDate).toBeUndefined()
      })
      expect(document.getElementById('usagesRangeStart')).toHaveValue('')
      expect(document.getElementById('usagesRangeEnd')).toHaveValue('')
    })
  })

  describe('calendar view', () => {
    beforeEach(() => {
      // Mittwoch, 16.09.2026 - Monatsraster: Mo 31.08. bis So 04.10.
      // Nur Date faken, damit userEvent/waitFor mit echten Timern laufen.
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 8, 16, 12, 0))
    })

    it('loads exactly the visible month without a page limit', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 10), 'c1'))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('10 neueste Nutzungen angezeigt')
      getUsagesWithVehicles.mockClear()
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 12), null))

      await userEvent.click(screen.getByRole('button', { name: 'Kalender' }))

      await waitFor(() => expect(getUsagesWithVehicles).toHaveBeenCalledTimes(1))
      const [orgId, options] = getUsagesWithVehicles.mock.calls[0]
      expect(orgId).toBe('org-1')
      expect(options.startDate).toBe(new Date(2026, 7, 31, 0, 0, 0, 0).toISOString())
      expect(options.endDate).toBe(new Date(2026, 9, 4, 23, 59, 59, 999).toISOString())
      expect(options.limit).toBeUndefined()
      expect(options.cursor).toBeUndefined()
      expect(await screen.findByText('12 Nutzungen gefunden')).toBeInTheDocument()
    })

    it('fetches again for the newly visible month when paging', async () => {
      getUsagesWithVehicles.mockResolvedValue(page([], null))
      renderWithIntl(<UebersichtEintraege />)
      await userEvent.click(await screen.findByRole('button', { name: 'Kalender' }))
      await waitFor(() =>
        expect(getUsagesWithVehicles.mock.calls.at(-1)![1].startDate).toBeDefined(),
      )
      getUsagesWithVehicles.mockClear()

      await userEvent.click(screen.getByRole('button', { name: '>' }))

      await waitFor(() => expect(getUsagesWithVehicles).toHaveBeenCalledTimes(1))
      expect(getUsagesWithVehicles.mock.calls[0][1].startDate).toBe(
        new Date(2026, 8, 28, 0, 0, 0, 0).toISOString(),
      )
    })

    it('hides the range filter toggle in calendar view and brings it back in list view', async () => {
      getUsagesWithVehicles.mockResolvedValue(page([], null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('Keine Nutzungen vorhanden')
      expect(screen.getByRole('button', { name: 'Zeitraum filtern' })).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Kalender' }))
      expect(screen.queryByRole('button', { name: 'Zeitraum filtern' })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Liste' }))
      expect(await screen.findByRole('button', { name: 'Zeitraum filtern' })).toBeInTheDocument()
    })

    it('reloads the first list page when switching back from the calendar', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(0, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')
      await userEvent.click(screen.getByRole('button', { name: 'Kalender' }))
      await waitFor(() =>
        expect(getUsagesWithVehicles.mock.calls.at(-1)![1].startDate).toBeDefined(),
      )
      getUsagesWithVehicles.mockClear()

      await userEvent.click(screen.getByRole('button', { name: 'Liste' }))

      await waitFor(() => expect(getUsagesWithVehicles).toHaveBeenCalledTimes(1))
      expect(getUsagesWithVehicles.mock.calls[0][1]).toMatchObject({ limit: 10 })
      expect(getUsagesWithVehicles.mock.calls[0][1].startDate).toBeUndefined()
    })
  })

  describe('permissions', () => {
    it('lets managers edit and delete every entry', async () => {
      getUsagesWithVehicles.mockResolvedValue(
        page([makeUsage(1, { creatorId: 'someone-else' })], null),
      )

      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('1 Nutzungen gefunden')

      expect(screen.getByTitle('Bearbeiten')).toBeInTheDocument()
      expect(screen.getByTitle('Löschen')).toBeInTheDocument()
    })

    it('lets an employee edit only their own entries and never delete', async () => {
      orgState.canManageSelectedOrganization = false
      getUsagesWithVehicles.mockResolvedValue(
        page(
          [makeUsage(1, { creatorId: 'me' }), makeUsage(2, { creatorId: 'someone-else' })],
          null,
        ),
      )

      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')

      expect(screen.getAllByTitle('Bearbeiten')).toHaveLength(1)
      expect(screen.queryByTitle('Löschen')).not.toBeInTheDocument()
    })
  })

  describe('delete', () => {
    it('removes the entry after confirming and calls DELETE', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(1, 2), null))
      authenticatedFetch.mockResolvedValue(new Response('{}', { status: 200 }))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')

      await userEvent.click(screen.getAllByTitle('Löschen')[0])
      const dialog = await screen.findByRole('dialog', { name: 'Nutzung löschen' })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))

      await waitFor(() => expect(cards()).toHaveLength(1))
      expect(authenticatedFetch).toHaveBeenCalledTimes(1)
      expect(authenticatedFetch.mock.calls[0][0]).toBe('https://api.example.test/api/usages/u1')
      expect(authenticatedFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
      expect(await screen.findByText('Nutzung erfolgreich gelöscht')).toBeInTheDocument()
    })

    it('keeps the entry when the server rejects the deletion', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      getUsagesWithVehicles.mockResolvedValue(page(usages(1, 2), null))
      authenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'nope' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')

      await userEvent.click(screen.getAllByTitle('Löschen')[0])
      const dialog = await screen.findByRole('dialog', { name: 'Nutzung löschen' })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))

      await waitFor(() => expect(authenticatedFetch).toHaveBeenCalledTimes(1))
      await waitFor(() =>
        expect(screen.queryByText('Nutzung erfolgreich gelöscht')).not.toBeInTheDocument(),
      )
      expect(cards()).toHaveLength(2)
      consoleError.mockRestore()
    })

    it('does nothing when the dialog is cancelled', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(1, 2), null))
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('2 Nutzungen gefunden')

      await userEvent.click(screen.getAllByTitle('Löschen')[0])
      const dialog = await screen.findByRole('dialog', { name: 'Nutzung löschen' })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))

      expect(screen.queryByRole('dialog', { name: 'Nutzung löschen' })).not.toBeInTheDocument()
      expect(authenticatedFetch).not.toHaveBeenCalled()
      expect(cards()).toHaveLength(2)
    })
  })

  describe('edit dialog', () => {
    it('offers all vehicles of the organization, also those without any usage', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(1, 1), null))
      getOrganizationVehicles.mockResolvedValue([
        vehicle,
        { id: 'v2', name: 'Quad ohne Nutzung', vehicleType: 'Quad' },
      ])
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('1 Nutzungen gefunden')
      await waitFor(() => expect(getOrganizationVehicles).toHaveBeenCalledWith('org-1', expect.anything()))

      await userEvent.click(screen.getByTitle('Bearbeiten'))

      const dialog = await screen.findByRole('heading', { name: 'Nutzung bearbeiten' })
      expect(dialog).toBeInTheDocument()
      const select = screen.getByLabelText('Fahrzeug')
      const options = within(select).getAllByRole('option').map((o) => o.textContent)
      expect(options).toEqual(['Pistenbully 1 (BE 1)', 'Quad ohne Nutzung '])
    })

    it('still resolves the vehicle of an entry that is no longer in the active fleet', async () => {
      getUsagesWithVehicles.mockResolvedValue(
        page([makeUsage(1, { vehicleId: 'old', vehicle: { id: 'old', name: 'Ausrangiert', vehicleType: 'Quad' } })], null),
      )
      getOrganizationVehicles.mockResolvedValue([{ id: 'v2', name: 'Aktiv', vehicleType: 'Quad' }])
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('1 Nutzungen gefunden')
      await waitFor(() => expect(getOrganizationVehicles).toHaveBeenCalled())

      await userEvent.click(screen.getByTitle('Bearbeiten'))

      const select = screen.getByLabelText('Fahrzeug') as HTMLSelectElement
      expect(select.value).toBe('old')
      expect(within(select).getByRole('option', { name: /Ausrangiert/ })).toBeInTheDocument()
    })

    it('saves the changes via PUT and updates the list entry', async () => {
      getUsagesWithVehicles.mockResolvedValue(page(usages(1, 1), null))
      authenticatedFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'u1',
            vehicleId: 'v1',
            startOperatingHours: 101,
            endOperatingHours: 999,
            fuelLitersRefilled: 50,
            usageDate: new Date(2026, 8, 16).toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      renderWithIntl(<UebersichtEintraege />)
      await screen.findByText('1 Nutzungen gefunden')
      await userEvent.click(screen.getByTitle('Bearbeiten'))

      const endInput = await screen.findByLabelText('End-Betriebsstunden')
      await userEvent.clear(endInput)
      await userEvent.type(endInput, '999')
      await userEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }))

      await waitFor(() => expect(authenticatedFetch).toHaveBeenCalledTimes(1))
      expect(authenticatedFetch.mock.calls[0][0]).toBe('https://api.example.test/api/usages/u1')
      expect(authenticatedFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' })
      expect(JSON.parse(authenticatedFetch.mock.calls[0][1].body)).toMatchObject({
        vehicleId: 'v1',
        endOperatingHours: 999,
      })
      expect(await screen.findByText('Nutzung erfolgreich aktualisiert')).toBeInTheDocument()
      expect(screen.getByText(/999\.0 h/)).toBeInTheDocument()
    })
  })
})
