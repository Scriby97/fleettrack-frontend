// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'
import { jsonResponse } from '@/test/http'
import { toDatetimeLocalValue } from '@/lib/dates/rangeDefaults'

const authenticatedFetch = vi.fn()
vi.mock('@/lib/api/authenticatedFetch', () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args),
}))

const auth = { isAdmin: false }
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => auth }))

const orgState = {
  organizations: [
    { id: 'org-1', name: 'Org 1' },
    { id: 'org-2', name: 'Org 2' },
  ],
  selectedOrgId: 'org-1' as string | null,
  setSelectedOrgId: vi.fn(),
  canManageSelectedOrganization: false,
}
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ ...orgState }),
}))

// Hat eine eigene Logik (Push-Berechtigung) - hier nur, ob sie eingeblendet wird.
vi.mock('./NotificationPermissionPrompt', () => ({
  NotificationPermissionPrompt: () => <div data-testid="notification-prompt" />,
}))

import CreateUsage from './createUsage'

// --- Helfer -----------------------------------------------------------------

const groomer = { id: 'v1', name: 'Pistenbully 1', plate: 'BE 1', snowsatNumber: '11', vehicleType: 'Pistenfahrzeug' }
const transporter = { id: 'v2', name: 'Transporter', plate: 'ZH 2' }
const otherOrgVehicle = { id: 'v3', name: 'Fremdes Fahrzeug', plate: 'GE 3' }

// Serverzustand der Attrappe
let vehiclesByOrg: Record<string, unknown[]>
let lastHours: Record<string, number | null | 'missing'>
let vehiclesResponse: (() => Promise<Response>) | null
let postResponse: (options: { body: string }) => Promise<Response>

function installServer() {
  authenticatedFetch.mockImplementation((url: string, options?: { method?: string; body?: string }) => {
    const parsed = new URL(url)
    const path = parsed.pathname.replace('/api', '')
    const orgId = parsed.searchParams.get('organizationId') ?? ''

    if (options?.method === 'POST' && path === '/usages') {
      return postResponse(options as { body: string })
    }
    if (path === '/vehicles') {
      return vehiclesResponse ? vehiclesResponse() : Promise.resolve(jsonResponse(vehiclesByOrg[orgId] ?? []))
    }
    const match = path.match(/^\/vehicles\/([^/]+)\/last-operating-hours$/)
    if (match) {
      const value = lastHours[match[1]]
      if (value === 'missing' || value === undefined) return Promise.resolve(jsonResponse({}, 404))
      return Promise.resolve(jsonResponse({ endOperatingHours: value }))
    }
    return Promise.reject(new Error(`unexpected request ${url}`))
  })
}

const callsTo = (predicate: (url: URL, options?: { method?: string }) => boolean) =>
  authenticatedFetch.mock.calls.filter(([url, options]) => predicate(new URL(url as string), options))

const postCalls = () => callsTo((_u, o) => o?.method === 'POST')
const lastHoursCalls = () => callsTo((u) => u.pathname.endsWith('/last-operating-hours'))

const startInput = () => document.getElementById('startOperatingHours') as HTMLInputElement
const endInput = () => document.getElementById('endOperatingHours') as HTMLInputElement
const fuelInput = () => document.getElementById('fuel') as HTMLInputElement
const dateInput = () => document.getElementById('usageDate') as HTMLInputElement
const vehicleSelect = () => document.getElementById('vehicle') as HTMLSelectElement
const submitButton = () => screen.getByRole('button', { name: /Nutzung speichern|Wird gespeichert/ })

const DRAFT_KEY = (org: string) => `fleettrack:createUsageDraft:${org}`
const readDraft = (org: string) => JSON.parse(window.localStorage.getItem(DRAFT_KEY(org)) ?? 'null')

// usageDate ist jetzt datetime-local (siehe CreateUsage/getNowDateTime) - der
// erwartete Default-Wert haengt von der lokalen Zeitzone der Testumgebung ab
// (CI vs. lokal), daher hier ueber dieselbe Konvertierungsfunktion berechnet
// statt hart codiert. new Date() liefert dank vi.setSystemTime() in beforeEach
// zuverlaessig den gefakten Zeitpunkt.
const defaultUsageDateLocal = () => toDatetimeLocalValue(new Date())

async function renderReady(props: React.ComponentProps<typeof CreateUsage> = {}) {
  const view = renderWithIntl(<CreateUsage {...props} />)
  await waitFor(() => expect(startInput()).not.toBeDisabled())
  await waitFor(() => expect(startInput().value).not.toBe(''))
  return view
}

async function fillEnd(value: string) {
  await userEvent.clear(endInput())
  await userEvent.type(endInput(), value)
}

describe('Nutzung erfassen', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-16T10:00:00Z'))
    authenticatedFetch.mockReset()
    vehiclesByOrg = { 'org-1': [groomer, transporter], 'org-2': [otherOrgVehicle] }
    lastHours = { v1: 636.7, v2: 12000, v3: 5 }
    vehiclesResponse = null
    postResponse = () => Promise.resolve(jsonResponse({ id: 'new-usage' }, 201))
    installServer()
    auth.isAdmin = false
    orgState.selectedOrgId = 'org-1'
    orgState.canManageSelectedOrganization = false
    orgState.setSelectedOrgId.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('loading', () => {
    it('loads the vehicles of the selected organization and preselects the first one', async () => {
      await renderReady()

      const url = new URL(authenticatedFetch.mock.calls[0][0] as string)
      expect(url.pathname).toBe('/api/vehicles')
      expect(url.searchParams.get('organizationId')).toBe('org-1')
      expect(vehicleSelect().value).toBe('v1')
      expect(within(vehicleSelect()).getByRole('option', { name: '11 - Pistenbully 1' })).toBeInTheDocument()
      expect(within(vehicleSelect()).getByRole('option', { name: 'Transporter' })).toBeInTheDocument()
    })

    it('prefills the start with the last counter reading of that vehicle', async () => {
      await renderReady()

      expect(startInput().value).toBe('636.7')
      const [call] = lastHoursCalls()
      expect(new URL(call[0] as string).pathname).toBe('/api/vehicles/v1/last-operating-hours')
      expect(new URL(call[0] as string).searchParams.get('organizationId')).toBe('org-1')
    })

    it('defaults the usage date to today', async () => {
      await renderReady()

      expect(dateInput().value).toBe(defaultUsageDateLocal())
    })

    it('does nothing before an organization is selected', () => {
      orgState.selectedOrgId = null

      renderWithIntl(<CreateUsage />)

      expect(authenticatedFetch).not.toHaveBeenCalled()
    })

    it('starts at 0 when the server has no previous reading', async () => {
      lastHours.v1 = 'missing'

      await renderReady()

      expect(startInput().value).toBe('0')
    })

    it('starts at 0 when the vehicle has no usage yet (null reading)', async () => {
      lastHours.v1 = null

      await renderReady()

      expect(startInput().value).toBe('0')
    })

    it('shows an error option and no "no vehicles" dialog when loading vehicles fails', async () => {
      vehiclesResponse = () => Promise.resolve(jsonResponse({ message: 'boom' }, 500))
      vi.spyOn(console, 'error').mockImplementation(() => {})

      renderWithIntl(<CreateUsage />)

      expect(await screen.findByRole('option', { name: 'Fehler beim Laden der Fahrzeuge' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows a loading option while the vehicles are being fetched', async () => {
      vehiclesResponse = () => new Promise(() => {})

      renderWithIntl(<CreateUsage />)

      expect(await screen.findByRole('option', { name: 'Lade Fahrzeuge...' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('vehicle switch', () => {
    it('reloads the start reading for the newly chosen vehicle', async () => {
      await renderReady()

      await userEvent.selectOptions(vehicleSelect(), 'v2')

      await waitFor(() => expect(startInput().value).toBe('12000'))
      expect(lastHoursCalls().map(([u]) => new URL(u as string).pathname)).toContain(
        '/api/vehicles/v2/last-operating-hours',
      )
    })

    it('uses hours for groomers and kilometers for all other vehicles', async () => {
      await renderReady()
      expect(screen.getByLabelText(/Start-Betriebsstunden/)).toBeInTheDocument()
      expect(startInput()).toHaveAttribute('step', '0.1')

      await userEvent.selectOptions(vehicleSelect(), 'v2')

      expect(await screen.findByLabelText(/Start-Kilometerstand/)).toBeInTheDocument()
      expect(screen.getByLabelText('End-Kilometerstand')).toBeInTheDocument()
      expect(startInput()).toHaveAttribute('step', '1')
    })
  })

  describe('organization selector', () => {
    it('is only shown for global administrators and changes the selection', async () => {
      auth.isAdmin = true
      await renderReady()

      await userEvent.selectOptions(screen.getByRole('combobox', { name: /Organi[sz]ation/ }), 'org-2')

      expect(orgState.setSelectedOrgId).toHaveBeenCalledWith('org-2')
    })

    it('is hidden for regular users', async () => {
      await renderReady()

      expect(screen.queryByRole('combobox', { name: /Organi[sz]ation/ })).not.toBeInTheDocument()
    })
  })

  describe('organization without vehicles', () => {
    beforeEach(() => {
      vehiclesByOrg['org-1'] = []
    })

    it('tells employees to ask their administrator', async () => {
      renderWithIntl(<CreateUsage onNavigateToAddVehicle={vi.fn()} />)

      const dialog = await screen.findByRole('dialog', { name: 'Noch keine Fahrzeuge erfasst' })
      expect(dialog).toHaveTextContent('Dein Organisationsadministrator muss zuerst Fahrzeuge erfassen')
      expect(within(dialog).queryByRole('button', { name: 'Jetzt Fahrzeug erfassen' })).not.toBeInTheDocument()
    })

    it('lets managers jump straight to creating a vehicle', async () => {
      orgState.canManageSelectedOrganization = true
      const onNavigateToAddVehicle = vi.fn()
      renderWithIntl(<CreateUsage onNavigateToAddVehicle={onNavigateToAddVehicle} />)
      const dialog = await screen.findByRole('dialog')
      expect(dialog).toHaveTextContent('Erfasse zuerst eure Fahrzeuge')

      await userEvent.click(within(dialog).getByRole('button', { name: 'Jetzt Fahrzeug erfassen' }))

      expect(onNavigateToAddVehicle).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not offer the shortcut to managers when no handler is given', async () => {
      orgState.canManageSelectedOrganization = true
      renderWithIntl(<CreateUsage />)

      const dialog = await screen.findByRole('dialog')

      expect(within(dialog).queryByRole('button', { name: 'Jetzt Fahrzeug erfassen' })).not.toBeInTheDocument()
    })

    it('can be dismissed', async () => {
      renderWithIntl(<CreateUsage />)
      const dialog = await screen.findByRole('dialog')

      await userEvent.click(within(dialog).getByRole('button', { name: 'Schließen' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('is not shown when the organization has vehicles', async () => {
      vehiclesByOrg['org-1'] = [groomer]

      await renderReady()

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('input validation', () => {
    it('warns inline and blocks saving when the end is not greater than the start', async () => {
      await renderReady()

      await fillEnd('600')

      expect(
        screen.getByText('End-Betriebsstunden müssen größer als Start-Betriebsstunden sein'),
      ).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()

      await fillEnd('700')

      expect(
        screen.queryByText('End-Betriebsstunden müssen größer als Start-Betriebsstunden sein'),
      ).not.toBeInTheDocument()
      expect(submitButton()).toBeEnabled()
    })

    it('treats an end equal to the start as invalid', async () => {
      await renderReady()

      await fillEnd('636.7')

      expect(submitButton()).toBeDisabled()
    })

    it('shows the duration in hours for groomers', async () => {
      await renderReady()

      await fillEnd('645.1')

      expect(screen.getByText('Gesamtdauer: 8.4 Stunden')).toBeInTheDocument()
    })

    it('shows the driven distance in km for other vehicles', async () => {
      await renderReady()
      await userEvent.selectOptions(vehicleSelect(), 'v2')
      await waitFor(() => expect(startInput().value).toBe('12000'))

      await fillEnd('12120')

      expect(screen.getByText('Gefahrene Strecke: 120 km')).toBeInTheDocument()
    })

    it('rejects a submit without an end reading and does not call the server', async () => {
      await renderReady()

      fireEvent.submit(submitButton().closest('form')!)

      expect(
        await screen.findByText('Start- und End-Betriebsstunden sind erforderlich'),
      ).toBeInTheDocument()
      expect(postCalls()).toHaveLength(0)
    })

    it('rejects a submit with an end below the start even if the button was bypassed', async () => {
      await renderReady()
      await fillEnd('100')

      fireEvent.submit(submitButton().closest('form')!)

      await waitFor(() =>
        expect(
          screen.getAllByText('End-Betriebsstunden müssen größer als Start-Betriebsstunden sein'),
        ).toHaveLength(2),
      )
      expect(postCalls()).toHaveLength(0)
    })

    it('rejects a submit without any vehicle', async () => {
      vehiclesByOrg['org-1'] = []
      renderWithIntl(<CreateUsage />)
      await screen.findByRole('dialog')

      fireEvent.submit(document.querySelector('form')!)

      expect(await screen.findByText('Bitte ein Fahrzeug auswählen')).toBeInTheDocument()
      expect(postCalls()).toHaveLength(0)
    })
  })

  describe('saving', () => {
    it('sends the usage and resets the form but keeps the vehicle', async () => {
      await renderReady()
      await fillEnd('645.1')
      await userEvent.type(fuelInput(), '45.5')
      // Nach dem Speichern hat der Server einen neuen letzten Stand
      lastHours.v1 = 645.1

      await userEvent.click(submitButton())

      expect(await screen.findByText('Nutzung erfolgreich gespeichert')).toBeInTheDocument()
      expect(postCalls()).toHaveLength(1)
      const [url, options] = postCalls()[0]
      expect(new URL(url as string).pathname).toBe('/api/usages')
      expect(JSON.parse(options.body)).toEqual({
        vehicleId: 'v1',
        startOperatingHours: 636.7,
        endOperatingHours: 645.1,
        fuelLitersRefilled: 45.5,
        usageDate: new Date(defaultUsageDateLocal()).toISOString(),
      })
      expect(endInput().value).toBe('')
      expect(fuelInput().value).toBe('')
      expect(vehicleSelect().value).toBe('v1')
      // neuer Start = zuletzt gespeicherter Endstand, frisch vom Server
      await waitFor(() => expect(startInput().value).toBe('645.1'))
      expect(screen.queryByText(/Gesamtdauer/)).not.toBeInTheDocument()
    })

    it('records 0 liters when no fuel was entered', async () => {
      await renderReady()
      await fillEnd('700')

      await userEvent.click(submitButton())
      await screen.findByText('Nutzung erfolgreich gespeichert')

      expect(JSON.parse(postCalls()[0][1].body).fuelLitersRefilled).toBe(0)
    })

    it('sends the chosen date', async () => {
      await renderReady()
      await fillEnd('700')
      fireEvent.change(dateInput(), { target: { value: '2026-09-10T14:00' } })

      await userEvent.click(submitButton())
      await screen.findByText('Nutzung erfolgreich gespeichert')

      expect(JSON.parse(postCalls()[0][1].body).usageDate).toBe(new Date('2026-09-10T14:00').toISOString())
    })

    it('records kilometers for a non-groomer vehicle', async () => {
      await renderReady()
      await userEvent.selectOptions(vehicleSelect(), 'v2')
      await waitFor(() => expect(startInput().value).toBe('12000'))
      await fillEnd('12120')

      await userEvent.click(submitButton())
      await screen.findByText('Nutzung erfolgreich gespeichert')

      expect(JSON.parse(postCalls()[0][1].body)).toMatchObject({
        vehicleId: 'v2',
        startOperatingHours: 12000,
        endOperatingHours: 12120,
      })
    })

    it('asks for notification permission after the first successful save', async () => {
      await renderReady()
      expect(screen.queryByTestId('notification-prompt')).not.toBeInTheDocument()
      await fillEnd('700')

      await userEvent.click(submitButton())

      expect(await screen.findByTestId('notification-prompt')).toBeInTheDocument()
    })

    it('blocks a second submit while the first is still running', async () => {
      let release!: () => void
      postResponse = () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(jsonResponse({ id: 'x' }, 201))
        })
      await renderReady()
      await fillEnd('700')

      await userEvent.click(submitButton())

      const pending = await screen.findByRole('button', { name: 'Wird gespeichert...' })
      expect(pending).toBeDisabled()
      await userEvent.click(pending)
      expect(postCalls()).toHaveLength(1)
      release()
      await screen.findByText('Nutzung erfolgreich gespeichert')
    })
  })

  describe('save errors', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('shows the server message, keeps the inputs and does not ask for notifications', async () => {
      postResponse = () => Promise.resolve(jsonResponse({ message: 'Endstand unplausibel' }, 400))
      await renderReady()
      await fillEnd('700')
      await userEvent.type(fuelInput(), '20')

      await userEvent.click(submitButton())

      expect(await screen.findByText('Endstand unplausibel')).toBeInTheDocument()
      expect(await screen.findByText('Fehler beim Speichern der Nutzung')).toBeInTheDocument()
      expect(endInput().value).toBe('700')
      expect(fuelInput().value).toBe('20')
      expect(screen.queryByTestId('notification-prompt')).not.toBeInTheDocument()
      expect(submitButton()).toBeEnabled()
    })

    it('translates a known backend error code into the UI language', async () => {
      postResponse = () =>
        Promise.resolve(
          jsonResponse({ message: 'Vehicle not in your org', code: 'VEHICLE_NOT_IN_YOUR_ORG' }, 403),
        )
      await renderReady()
      await fillEnd('700')

      await userEvent.click(submitButton())

      expect(await screen.findByText('Fahrzeug gehört nicht zu deiner Organisation.')).toBeInTheDocument()
    })

    it('reports a lost connection and keeps the inputs so the driver can retry later', async () => {
      postResponse = () => Promise.reject(new TypeError('Failed to fetch'))
      await renderReady()
      await fillEnd('700')

      await userEvent.click(submitButton())

      const offlineText =
        'Keine Verbindung zum Server. Die Nutzung konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten - bitte versuche es erneut, sobald du wieder online bist.'
      expect((await screen.findAllByText(offlineText)).length).toBeGreaterThan(0)
      expect(endInput().value).toBe('700')
      expect(readDraft('org-1')).toMatchObject({ vehicleId: 'v1', endOperatingHours: '700' })
    })

    it('treats a request timeout as offline', async () => {
      postResponse = () => Promise.reject(new DOMException('timeout', 'TimeoutError'))
      await renderReady()
      await fillEnd('700')

      await userEvent.click(submitButton())

      expect((await screen.findAllByText(/Keine Verbindung zum Server/)).length).toBeGreaterThan(0)
    })

    it('treats any failure as offline when the browser reports being offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      postResponse = () => Promise.resolve(jsonResponse({ message: 'irgendwas' }, 500))
      await renderReady()
      await fillEnd('700')

      await userEvent.click(submitButton())

      expect((await screen.findAllByText(/Keine Verbindung zum Server/)).length).toBeGreaterThan(0)
    })
  })

  describe('draft (offline safety)', () => {
    it('stores the inputs per organization while typing', async () => {
      await renderReady()

      await fillEnd('700')
      await userEvent.type(fuelInput(), '12')

      await waitFor(() =>
        expect(readDraft('org-1')).toEqual({
          vehicleId: 'v1',
          startOperatingHours: '636.7',
          endOperatingHours: '700',
          fuel: '12',
          usageDate: defaultUsageDateLocal(),
        }),
      )
      expect(readDraft('org-2')).toBeNull()
    })

    it('restores a draft, including the vehicle, and keeps its start instead of the server value', async () => {
      window.localStorage.setItem(
        DRAFT_KEY('org-1'),
        JSON.stringify({
          vehicleId: 'v2',
          startOperatingHours: '12050',
          endOperatingHours: '12100',
          fuel: '30',
          usageDate: '2026-09-12T08:00',
        }),
      )

      renderWithIntl(<CreateUsage />)

      await waitFor(() => expect(vehicleSelect().value).toBe('v2'))
      expect(startInput().value).toBe('12050')
      expect(endInput().value).toBe('12100')
      expect(fuelInput().value).toBe('30')
      expect(dateInput().value).toBe('2026-09-12T08:00')
      expect(screen.getByText('Gefahrene Strecke: 50 km')).toBeInTheDocument()
      expect(lastHoursCalls()).toHaveLength(0)
    })

    it('does not wipe an existing draft while it is still being restored', async () => {
      const draft = {
        vehicleId: 'v1',
        startOperatingHours: '636.7',
        endOperatingHours: '650',
        fuel: '',
        usageDate: '2026-09-12T08:00',
      }
      window.localStorage.setItem(DRAFT_KEY('org-1'), JSON.stringify(draft))

      renderWithIntl(<CreateUsage />)
      await waitFor(() => expect(endInput().value).toBe('650'))

      expect(readDraft('org-1')).toEqual(draft)
    })

    it('falls back to the first vehicle and reloads the start when the drafted vehicle is gone', async () => {
      window.localStorage.setItem(
        DRAFT_KEY('org-1'),
        JSON.stringify({ vehicleId: 'deleted', startOperatingHours: '5', endOperatingHours: '' }),
      )

      renderWithIntl(<CreateUsage />)

      await waitFor(() => expect(vehicleSelect().value).toBe('v1'))
      await waitFor(() => expect(startInput().value).toBe('636.7'))
    })

    it('ignores a corrupt draft', async () => {
      window.localStorage.setItem(DRAFT_KEY('org-1'), '{not json')

      await renderReady()

      expect(vehicleSelect().value).toBe('v1')
      expect(startInput().value).toBe('636.7')
    })

    it('loads the draft of the newly selected organization and does not leak the old one', async () => {
      window.localStorage.setItem(
        DRAFT_KEY('org-2'),
        JSON.stringify({
          vehicleId: 'v3',
          startOperatingHours: '7',
          endOperatingHours: '9',
          fuel: '1',
          usageDate: '2026-09-01T08:00',
        }),
      )
      const { rerender } = await renderReady()
      await fillEnd('700')
      await waitFor(() => expect(readDraft('org-1')?.endOperatingHours).toBe('700'))

      orgState.selectedOrgId = 'org-2'
      rerender(<CreateUsage />)

      await waitFor(() => expect(vehicleSelect().value).toBe('v3'))
      expect(endInput().value).toBe('9')
      expect(dateInput().value).toBe('2026-09-01T08:00')
      expect(readDraft('org-1')?.endOperatingHours).toBe('700')
      expect(readDraft('org-2')?.endOperatingHours).toBe('9')
    })

    it("never writes the old organization's inputs into the new organization's draft, not even briefly", async () => {
      const { rerender } = await renderReady()
      await fillEnd('700')
      await waitFor(() => expect(readDraft('org-1')?.endOperatingHours).toBe('700'))
      const writes: [string, string][] = []
      const originalSetItem = Storage.prototype.setItem
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
        writes.push([key, value])
        return originalSetItem.call(this, key, value)
      })

      orgState.selectedOrgId = 'org-2'
      rerender(<CreateUsage />)
      await waitFor(() => expect(vehicleSelect().value).toBe('v3'))

      const toOrg2 = writes.filter(([key]) => key === DRAFT_KEY('org-2'))
      expect(toOrg2.length).toBeGreaterThan(0)
      for (const [, value] of toOrg2) {
        expect(JSON.parse(value).endOperatingHours).not.toBe('700')
      }
    })

    it('clears the drafted inputs after a successful save (vehicle stays)', async () => {
      await renderReady()
      await fillEnd('700')
      await userEvent.type(fuelInput(), '12')
      await waitFor(() => expect(readDraft('org-1')?.endOperatingHours).toBe('700'))

      await userEvent.click(submitButton())
      await screen.findByText('Nutzung erfolgreich gespeichert')

      await waitFor(() => expect(readDraft('org-1')?.endOperatingHours).toBe(''))
      expect(readDraft('org-1')?.fuel).toBe('')
      expect(readDraft('org-1')?.vehicleId).toBe('v1')
    })
  })
})
