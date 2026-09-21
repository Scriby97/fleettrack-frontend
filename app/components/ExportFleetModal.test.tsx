// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'
import { cellStyle, entryText, readSheetRows, readStoredZip } from '@/test/xlsxRead'
import { crc32, XLSX_MIME } from '@/lib/xlsx/xlsx'

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

import ExportFleetModal from './ExportFleetModal'

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

function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

// Liest die zuletzt erzeugte Excel-Datei wieder ein.
const lastWorkbook = async () => {
  const entries = readStoredZip(await readBytes(createdBlobs.at(-1)!))
  const sheet = entryText(entries, 'xl/worksheets/sheet1.xml')
  return { entries, sheet, rows: readSheetRows(sheet), workbook: entryText(entries, 'xl/workbook.xml') }
}

function setDatetime(id: string, value: string) {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } })
}

const renderModal = (props: Partial<React.ComponentProps<typeof ExportFleetModal>> = {}) => {
  const onClose = vi.fn()
  const view = renderWithIntl(
    <ExportFleetModal
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

describe('ExportFleetModal', () => {
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

    it('writes a range line, a header and one row per vehicle (hours for groomers, km for others)', async () => {
      renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))
      const { rows } = await lastWorkbook()

      expect(rows[0][0]).toBe('Zeitraum')
      expect(rows[0][1]).toContain('–')
      expect(rows[1]).toEqual([])
      expect(rows[2]).toEqual([
        'Fahrzeug',
        'Typ',
        'SNOWsat-Nr',
        'Kennzeichen',
        'Status',
        'Betriebsstunden (h)',
        'Kilometer (km)',
        'Getankt (L)',
        'Nutzungen',
      ])
      expect(rows[3]).toEqual(['Pistenbully 1', 'Pistenfahrzeug', '11', 'BE 1', 'Aktiv', 10.8, null, 360, 3])
      expect(rows[4]).toEqual(['Transporter', '—', null, 'ZH 2', 'Aktiv', null, 1235, 80, 2])
      expect(rows[5]).toEqual(['Quad', 'Quad', null, 'VS 3', 'Ausrangiert', null, 50, 0, 1])
      expect(rows).toHaveLength(6)
    })

    it('writes the measured values as real numbers with a number format, so Excel can calculate with them', async () => {
      renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))
      const { rows, sheet } = await lastWorkbook()

      for (const value of [rows[3][5], rows[3][7], rows[3][8], rows[4][6]]) {
        expect(typeof value).toBe('number')
      }
      expect(cellStyle(sheet, 'F4')).toBe(2) // Betriebsstunden: 1 Nachkommastelle
      expect(cellStyle(sheet, 'G5')).toBe(3) // Kilometer: ganze Zahl
      expect(cellStyle(sheet, 'H4')).toBe(3) // Liter
      expect(cellStyle(sheet, 'I4')).toBe(3) // Anzahl
    })

    it('highlights the header row', async () => {
      renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))
      const { sheet } = await lastWorkbook()

      for (const ref of ['A3', 'E3', 'I3']) expect(cellStyle(sheet, ref)).toBe(1)
      expect(cellStyle(sheet, 'A4')).toBeNull()
    })

    it('produces a valid Excel file (.xlsx) with the right MIME type', async () => {
      renderModal()

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      expect(createdBlobs[0].type).toBe(XLSX_MIME)
      const bytes = await readBytes(createdBlobs[0])
      expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]) // "PK"
      const { entries } = await lastWorkbook()
      expect(entries.map((e) => e.name)).toContain('xl/worksheets/sheet1.xml')
      for (const entry of entries) expect(entry.storedCrc).toBe(crc32(entry.data))
    })

    it('names the sheet after the organization', async () => {
      renderModal({ organizationName: 'Bergbahnen Gstaad AG' })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      expect((await lastWorkbook()).workbook).toContain('name="Bergbahnen Gstaad AG"')
    })

    it('names the file after the organization and the range', async () => {
      renderModal({ organizationName: 'Bergbahnen Gstaad AG' })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(downloads).toHaveLength(1))

      expect(downloads[0].filename).toBe('Bergbahnen_Gstaad_AG_2026-01-01_bis_2026-01-31.xlsx')
    })

    it('falls back to "Flotte" without an organization name', async () => {
      renderModal({ organizationName: undefined })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(downloads).toHaveLength(1))

      expect(downloads[0].filename).toBe('Flotte_2026-01-01_bis_2026-01-31.xlsx')
    })

    it('only exports the selected vehicle types', async () => {
      renderModal()
      await userEvent.click(screen.getByRole('checkbox', { name: 'Pistenfahrzeuge' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Quads' }))

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      expect(getVehicleUsageHistory.mock.calls.map((c) => c[0])).toEqual(['t1'])
      const { rows } = await lastWorkbook()
      expect(rows).toHaveLength(4)
      expect(rows[3][0]).toBe('Transporter')
    })

    it('keeps names with commas, quotes, semicolons and XML characters intact', async () => {
      const name = 'Bully "Gelb", Nord; Süd & <Co>'
      renderModal({
        vehicles: [{ id: 'g1', name, plate: 'BE 1', vehicleType: 'Pistenfahrzeug' }],
      })

      await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }))
      await waitFor(() => expect(createdBlobs).toHaveLength(1))

      expect((await lastWorkbook()).rows[3][0]).toBe(name)
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

      const { rows } = await lastWorkbook()
      expect(rows[4]).toEqual(['Transporter', '—', null, 'ZH 2', 'Aktiv'])
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
