// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/renderWithIntl'

const router = { push: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/',
}))

const orgState = { canManageSelectedOrganization: true }
vi.mock('@/lib/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ ...orgState }),
}))

vi.mock('@/lib/contexts/FleetConsistencyContext', () => ({
  useFleetConsistency: () => ({ getWarningLabel: () => undefined }),
}))

const modalState = { isAnyModalOpen: false }
vi.mock('@/lib/contexts/ModalVisibilityContext', () => ({
  useModalVisibility: () => ({ ...modalState }),
}))

import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  beforeEach(() => {
    router.push.mockReset()
    orgState.canManageSelectedOrganization = true
    modalState.isAnyModalOpen = false
  })

  it('renders the tab bar normally when no modal is open', () => {
    renderWithIntl(<BottomNav active="nutzung" onNavigate={() => {}} />)

    expect(screen.getByText('Erfassen')).toBeInTheDocument()
  })

  it('renders nothing while a modal is open', () => {
    // Siehe ModalVisibilityContext: auf manchen mobilen Browsern rendert die
    // fixed-positionierte BottomNav trotz niedrigerem z-index ueber dem
    // Modal-Hintergrund durch - daher komplett ausblenden statt per z-index.
    modalState.isAnyModalOpen = true

    const { container } = renderWithIntl(<BottomNav active="nutzung" onNavigate={() => {}} />)

    expect(container).toBeEmptyDOMElement()
  })
})
