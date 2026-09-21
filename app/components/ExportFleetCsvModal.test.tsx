// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'

const getVehicleUsageHistory = vi.fn()
vi.mock('@/lib/api/vehicles', () => ({
  getVehicleUsageHistory: (...args: unknown[]) => getVehicleUsageHistory(...args),
}))

// Beim Import von "typeRank"/"VEHICLE_GROUPS" aus ./vehicles werden dessen
// Abhaengigkeiten mitgeladen - hier nur als leere Huellen.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}))
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => ({ isAdmin: false }) }))
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ organizations: [], selectedOrgId: null, setSelectedOrgId: vi.fn() }),
}))
vi.mock('@/lib/api/authenticatedFetch', () => ({ authenticatedFetch: vi.fn() }))

import ExportFleetCsvModal from './ExportFleetCsvModal'

// --- Helfer -----------------------------------------------------------------

const groomer = {
  id: 'g1',
  name: 'Pistenbully 1',
  plate: 'BE 1',
  snowsatNumber: '11',
  vehicleType: 'Pistenfahrzeug',
}
const transporter = { id: 't1', name: 'Transporter', plate: 'ZH 2' }
const quad = { id: 'q1', name: 'Quad', plate: 'VS 3', vehicleType: 'Quad', isRetired: true }

const history = (totals: Partial<Record<string, number>>) => ({
  vehicle: {},
  totals: { operatingHours: 0, fuelLiters: 0, firstHours: null, lastHours: null, usageCount: 0, ...totals },
  daily: [],
})

let downloads: { filename: string; blob: Blob }[] = []
let createdBlobs: Blob[] = []

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

function readBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

const lastCsv = async () => {
  const text = await readBlob(createdBlobs.at(-1)!)
  return text.replace(/^﻿/, '').split('\r\n')
}

function setDatetime(id: string, value: string) {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } })
}

const renderModal = (props: Partial<React.ComponentProps<typeof ExportFleetCsvModal>> = {}) => {
  const onClose = vi.fn()
  const view = renderWithIntl(
    <ExportFleetCsvModal
      vehicles={[groomer, transporter, quad]}
      organizationName="Bergbahnen AG"
      initialRangeStart="2026-01-01T00:00"
      initialRangeEnd="2026-01-31T23:59"
      onClose={onClose}
      {...props}
    />,
  )
  return { onClose, ...view }
}

describe('ExportFleetCsvModal', () => {
  beforeEach(() => {
    getVehicleUsageHistory.mockReset()
    downloads = []
    createdBlobs = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob)
      return 'blob:test'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ filename: this.download, blob: createdBlobs.at(-1)! })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('form', () => {
    it('starts with all vehicle types selected and the given range', () => {
      renderModal()

      for (const name of ['Pistenfahrzeuge', 'Transporter', 'Quads', 'Skidoos']) {
        expect(screen.getByRole('checkbox', { name })).toBeChecked()
      }
      expect(document.getElementById('exportRangeStart')).toHaveValue('2026-01-01T00:00')
      expect(document.getElementById('exportRangeEnd')).toHaveValue('2026-01-31T23:59')
    })

    it('disables the export when no type is selected', async () => {
      renderModal()

      for (const name of ['Pistenfahrzeuge', 'Transporter', 'Quads', 'Skidoos']) {
        await userEvent.click(screen.getByRole('checkbox', { name }))
      }

      expect(screen.getByRole('button', { name: 'Exportieren' })).toBeDisabled()
    })

    it('shows an error and disables the export when start is after end', () => {
      renderModal()

      setDatetime('exportRangeStart', '2026-03-01T00:00')

      expect(screen.getByText('Das Startdatum muss vor dem Enddatum liegen.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Exportieren' })).toBeDisabled()
    })

    it('closes via "Abbrechen"', async () => {
      const { onClose } = renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('export', () => {
    beforeEach(() => {
      getVehicleUsageHistory.mockImplementation((id: string) => {
        if (id === 'g1') return Promise.resolve(history({ operatingHours: 10.76, fuelLiters: 360.4, usageCount: 3 }))
        if (id === 't1') return Promise.resolve(history({ operatingHours: 1234.6, fuelLiters: 80, usageCount: 2 }))
        return Promise.resolve(history({ operatingHours: 50, fuelLiters: 0, usageCount: 1 }))
      })
    })

    it('asks the server for every selected vehicle with the range as ISO timestamps', async () => {
      renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(getVehicleUsageHistory).toHaveBeenCalledTimes(3))

      expect(getVehicleUsageHistory).toHaveBeenCalledWith('g1', {
        startDate: new Date('2026-01-01T00:00').toISOString(),
        endDate: new Date('2026-01-31T23:59').toISOString(),
      })
    })

    it('writes a header, the range line and one row per vehicle (hours for groomers, km for others)', async () => {
      renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))
      const lines = await lastCsv()

      expect(lines[0]).toMatch(/^Zeitraum,/)
      expect(lines[1]).toBe('')
      expect(lines[2]).toBe(
        'Fahrzeug,Typ,SNOWsat-Nr,Kennzeichen,Status,Betriebsstunden (h),Kilometer (km),Getankt (L),Nutzungen',
      )
      expect(lines[3]).toBe('Pistenbully 1,Pistenfahrzeug,11,BE 1,Aktiv,10.8,,360,3')
      expect(lines[4]).toBe('Transporter,—,,ZH 2,Aktiv,,1235,80,2')
      expect(lines[5]).toBe('Quad,Quad,,VS 3,Ausrangiert,,50,0,1')
      expect(lines).toHaveLength(6)
    })

    it('starts the file with a BOM so Excel detects UTF-8', async () => {
      renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      const bytes = new Uint8Array(await readBytes(createdBlobs[0]))
      expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    })

    it('names the file after the organization and the range', async () => {
      renderModal({ organizationName: 'Bergbahnen Gstaad AG' })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(downloads).toHaveLength(1))

      expect(downloads[0].filename).toBe('Bergbahnen_Gstaad_AG_2026-01-01_bis_2026-01-31.csv')
    })

    it('falls back to "Flotte" without an organization name', async () => {
      renderModal({ organizationName: undefined })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(downloads).toHaveLength(1))

      expect(downloads[0].filename).toBe('Flotte_2026-01-01_bis_2026-01-31.csv')
    })

    it('only exports the selected vehicle types', async () => {
      renderModal()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Pistenfahrzeuge' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Quads' }))

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      expect(getVehicleUsageHistory.mock.calls.map((c) => c[0])).toEqual(['t1'])
      const lines = await lastCsv()
      expect(lines).toHaveLength(4)
      expect(lines[3]).toMatch(/^Transporter,/)
    })

    it('escapes commas and quotes in vehicle names', async () => {
      renderModal({
        vehicles: [{ id: 'g1', name: 'Bully "Gelb", Nord', plate: 'BE 1', vehicleType: 'Pistenfahrzeug' }],
      })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      expect((await lastCsv())[3]).toMatch(/^"Bully ""Gelb"", Nord",Pistenfahrzeug,/)
    })

    it('confirms with a toast and closes the modal', async () => {
      const { onClose } = renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))

      expect(await screen.findByText('Report wurde exportiert')).toBeInTheDocument()
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
    })

    it('still exports when some vehicles fail, leaves their values empty and warns', async () => {
      getVehicleUsageHistory.mockImplementation((id: string) =>
        id === 't1'
          ? Promise.reject(new Error('boom'))
          : Promise.resolve(history({ operatingHours: 5, fuelLiters: 1, usageCount: 1 })),
      )
      const { onClose } = renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      const lines = await lastCsv()
      expect(lines[4]).toBe('Transporter,—,,ZH 2,Aktiv,,,,')
      expect(
        await screen.findByText(
          'Report wurde exportiert, aber für 1 Fahrzeug(e) konnten keine Daten geladen werden',
        ),
      ).toBeInTheDocument()
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('shows an error and does not call the server when the chosen types have no vehicles', async () => {
      renderModal({ vehicles: [groomer] })
      await userEvent.click(screen.getByRole('checkbox', { name: 'Pistenfahrzeuge' }))

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))

      expect(
        await screen.findByText('Für die gewählten Fahrzeugtypen sind keine Fahrzeuge vorhanden.'),
      ).toBeInTheDocument()
      expect(getVehicleUsageHistory).not.toHaveBeenCalled()
      expect(createdBlobs).toHaveLength(0)
    })

    it('reports a generic error and stays open when the report cannot be built', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { onClose } = renderModal()
      // Start leer -> ungueltiges Datum
      setDatetime('exportRangeStart', '')

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))

      expect(await screen.findByText('Fehler beim Erstellen des Reports')).toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Exportieren' })).toBeEnabled()
      consoleError.mockRestore()
    })

    it('blocks double submission and closing while the export is running', async () => {
      let release!: () => void
      getVehicleUsageHistory.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () => resolve(history({ operatingHours: 1 }))
          }),
      )
      renderModal({ vehicles: [groomer] })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))

      expect(screen.getByRole('button', { name: 'Report wird erstellt...' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled()

      await act(async () => release())
      await waitFor(() => expect(createdBlobs).toHaveLength(1))
    })
  })
})
