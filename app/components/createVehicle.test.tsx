// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'
import { jsonResponse } from '@/test/http'

const authenticatedFetch = vi.fn()
vi.mock('@/lib/api/authenticatedFetch', () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args),
}))

const auth = { isAdmin: false }
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => auth }))

const orgState = {
  organizations: [{ id: 'org-1', name: 'Org 1' }],
  selectedOrgId: 'org-1' as string | null,
  setSelectedOrgId: vi.fn(),
}
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ ...orgState }),
}))

import CreateVehicle from './createVehicle'

// --- Helfer -----------------------------------------------------------------

const nameInput = () => document.getElementById('name') as HTMLInputElement
const plateInput = () => document.getElementById('plate') as HTMLInputElement
const snowsatInput = () => document.getElementById('snowsatNumber') as HTMLInputElement
const typeSelect = () => document.getElementById('vehicleType') as HTMLSelectElement
const readingInput = () => document.getElementById('currentOperatingHours') as HTMLInputElement
const submitButton = () => screen.getByRole('button', { name: /Fahrzeug hinzufügen|Wird hinzugefügt/ })

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(nameInput(), 'Leitwolf')
  await user.type(plateInput(), 'BE 1')
  await user.type(snowsatInput(), 'SLG_01')
}

describe('Fahrzeug erfassen', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test')
    authenticatedFetch.mockReset()
  })

  describe('Betriebsstunden vs. Kilometerstand', () => {
    it('shows the kilometer label by default (no type selected yet)', () => {
      renderWithIntl(<CreateVehicle />)

      expect(screen.getByText('Aktueller Kilometerstand')).toBeInTheDocument()
    })

    it('switches to the hours label once "Pistenfahrzeug" is selected', async () => {
      const user = userEvent.setup()
      renderWithIntl(<CreateVehicle />)

      await user.selectOptions(typeSelect(), 'Pistenfahrzeug')

      expect(screen.getByText('Aktueller Betriebsstundenstand')).toBeInTheDocument()
      expect(screen.queryByText('Aktueller Kilometerstand')).not.toBeInTheDocument()
    })

    it('switches back to the kilometer label for a non-groomer type', async () => {
      const user = userEvent.setup()
      renderWithIntl(<CreateVehicle />)

      await user.selectOptions(typeSelect(), 'Pistenfahrzeug')
      await user.selectOptions(typeSelect(), 'Quad')

      expect(screen.getByText('Aktueller Kilometerstand')).toBeInTheDocument()
    })
  })

  describe('saving', () => {
    it('sends the entered kilometer reading as a number alongside the vehicle', async () => {
      authenticatedFetch.mockResolvedValue(jsonResponse({ id: 'v1' }))
      const user = userEvent.setup()
      renderWithIntl(<CreateVehicle />)
      await fillRequiredFields(user)
      // Kein Typ gewaehlt -> Kilometer-Modus, step="1" - ganzzahliger Wert.
      await user.type(readingInput(), '907')

      await user.click(submitButton())

      await waitFor(() => expect(authenticatedFetch).toHaveBeenCalled())
      const [, options] = authenticatedFetch.mock.calls[0]
      const body = JSON.parse((options as { body: string }).body)
      expect(body.currentOperatingHours).toBe(907)
      expect(body.name).toBe('Leitwolf')
    })

    it('sends a decimal operating-hours reading for a groomer', async () => {
      authenticatedFetch.mockResolvedValue(jsonResponse({ id: 'v1' }))
      const user = userEvent.setup()
      renderWithIntl(<CreateVehicle />)
      await fillRequiredFields(user)
      await user.selectOptions(typeSelect(), 'Pistenfahrzeug')
      // Pistenfahrzeug -> Betriebsstunden-Modus, step="0.1" - Dezimalwert erlaubt.
      await user.type(readingInput(), '907.5')

      await user.click(submitButton())

      await waitFor(() => expect(authenticatedFetch).toHaveBeenCalled())
      const [, options] = authenticatedFetch.mock.calls[0]
      const body = JSON.parse((options as { body: string }).body)
      expect(body.currentOperatingHours).toBe(907.5)
      expect(body.vehicleType).toBe('Pistenfahrzeug')
    })

    it('accepts 0 as a valid reading for a brand-new vehicle', async () => {
      authenticatedFetch.mockResolvedValue(jsonResponse({ id: 'v1' }))
      const user = userEvent.setup()
      renderWithIntl(<CreateVehicle />)
      await fillRequiredFields(user)
      await user.type(readingInput(), '0')

      await user.click(submitButton())

      await waitFor(() => expect(authenticatedFetch).toHaveBeenCalled())
      const [, options] = authenticatedFetch.mock.calls[0]
      const body = JSON.parse((options as { body: string }).body)
      expect(body.currentOperatingHours).toBe(0)
    })
  })
})
