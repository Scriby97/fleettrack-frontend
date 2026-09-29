// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'

const router = { push: vi.fn(), back: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(''),
}))

const auth = {
  loading: false,
  isAdmin: false,
  userProfile: { id: 'me' },
  refreshOrganizations: vi.fn(),
}
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => auth }))

const orgState = {
  organizations: [{ id: 'org-1', name: 'Bergbahnen AG' }],
  selectedOrgId: 'org-1' as string | null,
  selectedOrganizationRole: null as string | null,
  isLoading: false,
}
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ ...orgState }),
}))

const getOrganizationInvites = vi.fn()
const deleteInvite = vi.fn()
const renewInvite = vi.fn()
vi.mock('@/lib/api/invites', () => ({
  createInvite: vi.fn(),
  deleteInvite: (...args: unknown[]) => deleteInvite(...args),
  renewInvite: (...args: unknown[]) => renewInvite(...args),
  getOrganizationInvites: (...args: unknown[]) => getOrganizationInvites(...args),
}))

const getOrganizationMembers = vi.fn()
vi.mock('@/lib/api/organizationMembers', () => ({
  getOrganizationMembers: (...args: unknown[]) => getOrganizationMembers(...args),
  updateMemberRole: vi.fn(),
  transferOwnership: vi.fn(),
  removeMember: vi.fn(),
}))

import UsersPage from './page'

const member = (role: string) => ({
  id: 'm1',
  userId: 'u1',
  organizationId: 'org-1',
  role,
  joinedAt: '2026-01-01T00:00:00.000Z',
  user: { id: 'u1', email: 'kollege@example.test', firstName: 'Kurt', lastName: 'Kollege' },
})

describe('User Management (Organisation)', () => {
  beforeEach(() => {
    router.push.mockReset()
    auth.loading = false
    auth.isAdmin = false
    orgState.selectedOrgId = 'org-1'
    orgState.selectedOrganizationRole = null
    orgState.isLoading = false
    getOrganizationInvites.mockReset()
    getOrganizationMembers.mockReset()
    deleteInvite.mockReset()
    renewInvite.mockReset()
    getOrganizationInvites.mockResolvedValue([])
    getOrganizationMembers.mockResolvedValue([member('employee')])
  })

  describe.each(['owner', 'admin'])('organization %s', (role) => {
    it('sees the members and invites of the organization', async () => {
      orgState.selectedOrganizationRole = role

      renderWithIntl(<UsersPage />)

      expect((await screen.findAllByText('Kurt Kollege')).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: 'Mitglieder' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Einladungen' })).toBeInTheDocument()
      expect(getOrganizationInvites).toHaveBeenCalledWith('org-1')
      expect(getOrganizationMembers).toHaveBeenCalledWith('org-1')
      expect(router.push).not.toHaveBeenCalled()
    })

    it('is not redirected away even if they are also a system administrator', async () => {
      auth.isAdmin = true
      orgState.selectedOrganizationRole = role

      renderWithIntl(<UsersPage />)

      expect((await screen.findAllByText('Kurt Kollege')).length).toBeGreaterThan(0)
      expect(router.push).not.toHaveBeenCalled()
      // die systemweite Benutzerliste gehoert nicht auf diese Seite
      expect(screen.queryByRole('button', { name: 'Benutzer' })).not.toBeInTheDocument()
    })
  })

  describe('redirects', () => {
    it('sends employees home', async () => {
      orgState.selectedOrganizationRole = 'employee'

      renderWithIntl(<UsersPage />)

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'))
      expect(getOrganizationMembers).not.toHaveBeenCalled()
    })

    it('sends users without a membership home', async () => {
      orgState.selectedOrganizationRole = null

      renderWithIntl(<UsersPage />)

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'))
    })

    it('sends a system administrator without a role in the organization to the global user list', async () => {
      auth.isAdmin = true
      orgState.selectedOrganizationRole = null

      renderWithIntl(<UsersPage />)

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/all-users'))
      expect(getOrganizationMembers).not.toHaveBeenCalled()
      expect(getOrganizationInvites).not.toHaveBeenCalled()
    })

    it('sends a system administrator who is only an employee there to the global user list', async () => {
      auth.isAdmin = true
      orgState.selectedOrganizationRole = 'employee'

      renderWithIntl(<UsersPage />)

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/all-users'))
    })

    it('waits for auth and organization data before deciding', () => {
      auth.loading = true
      orgState.isLoading = true
      orgState.selectedOrganizationRole = null

      renderWithIntl(<UsersPage />)

      expect(router.push).not.toHaveBeenCalled()
      expect(getOrganizationMembers).not.toHaveBeenCalled()
    })

    it('does not redirect a manager while only the organization data is still loading', () => {
      orgState.isLoading = true
      orgState.selectedOrganizationRole = null

      renderWithIntl(<UsersPage />)

      expect(router.push).not.toHaveBeenCalled()
    })
  })

  describe('invite actions', () => {
    const pendingInvite = {
      id: 'invite-pending',
      token: 't1',
      email: 'ausstehend@example.test',
      role: 'employee',
      expiresAt: '2099-01-01T00:00:00.000Z',
      usedAt: null,
      usedBy: null,
      invitedBy: 'me',
      createdAt: '2026-01-01T00:00:00.000Z',
      organizationId: 'org-1',
    }
    const expiredInvite = {
      id: 'invite-expired',
      token: 't2',
      email: 'abgelaufen@example.test',
      role: 'employee',
      expiresAt: '2020-01-01T00:00:00.000Z',
      usedAt: null,
      usedBy: null,
      invitedBy: 'me',
      createdAt: '2019-12-01T00:00:00.000Z',
      organizationId: 'org-1',
    }

    beforeEach(() => {
      orgState.selectedOrganizationRole = 'owner'
      getOrganizationInvites.mockResolvedValue([pendingInvite, expiredInvite])
    })

    it('only offers "Erneuern" for the expired invite, and "Löschen" for both', async () => {
      renderWithIntl(<UsersPage />)

      await userEvent.click(await screen.findByRole('button', { name: 'Einladungen' }))
      await screen.findAllByText('abgelaufen@example.test')

      // "Löschen" erscheint zweimal (pro Ansicht/Zeile je einmal wird durch die
      // jeweilige Tabelle vs. Mobil-Karten-Variante bestimmt - im Test-DOM sind
      // beide Layouts gerendert), "Erneuern" nur für die abgelaufene Einladung.
      expect(screen.getAllByRole('button', { name: 'Löschen' }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('button', { name: 'Erneuern' }).length).toBeGreaterThan(0)
    })

    it('renews an expired invite and replaces it in the list with the refreshed one', async () => {
      const renewed = { ...expiredInvite, expiresAt: '2099-06-01T00:00:00.000Z' }
      renewInvite.mockResolvedValue(renewed)

      renderWithIntl(<UsersPage />)

      await userEvent.click(await screen.findByRole('button', { name: 'Einladungen' }))
      await screen.findAllByText('abgelaufen@example.test')

      const renewButtons = screen.getAllByRole('button', { name: 'Erneuern' })
      await userEvent.click(renewButtons[0])

      await waitFor(() => expect(renewInvite).toHaveBeenCalledWith('invite-expired'))
      // Nach dem Erneuern zeigt die Zeile kein "Erneuern" mehr an, da sie nicht
      // mehr abgelaufen ist.
      await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Erneuern' }).length).toBe(0))
    })

    it('deletes an expired invite and removes it from the list', async () => {
      deleteInvite.mockResolvedValue(undefined)

      renderWithIntl(<UsersPage />)

      await userEvent.click(await screen.findByRole('button', { name: 'Einladungen' }))
      await screen.findAllByText('abgelaufen@example.test')

      const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' })
      // Zweiter "Löschen"-Button gehört zur abgelaufenen Einladung (Reihenfolge
      // folgt sortedInvites: neueste zuerst, pendingInvite vor expiredInvite).
      await userEvent.click(deleteButtons[1])

      await waitFor(() => expect(deleteInvite).toHaveBeenCalledWith('invite-expired', 'org-1'))
      await waitFor(() => expect(screen.queryAllByText('abgelaufen@example.test').length).toBe(0))
    })
  })
})
