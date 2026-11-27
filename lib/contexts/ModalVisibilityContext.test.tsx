// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ModalVisibilityProvider,
  useModalVisibility,
  useRegisterModalOpen,
} from './ModalVisibilityContext'

function Probe() {
  const { isAnyModalOpen } = useModalVisibility()
  return <p data-testid="open">{String(isAnyModalOpen)}</p>
}

// Simuliert einen Dialog, wie ihn ConfirmDialog/UsageEditDialog/etc. in der
// echten App rendern: solange `isOpen` true ist, meldet er sich an.
function FakeDialog({ isOpen }: { isOpen: boolean }) {
  useRegisterModalOpen(isOpen)
  return null
}

describe('ModalVisibilityContext', () => {
  it('starts with no modal open', () => {
    render(
      <ModalVisibilityProvider>
        <Probe />
      </ModalVisibilityProvider>,
    )

    expect(screen.getByTestId('open')).toHaveTextContent('false')
  })

  it('reports an open modal while a registered dialog is mounted, and closed again after it unmounts', () => {
    const { rerender } = render(
      <ModalVisibilityProvider>
        <Probe />
        <FakeDialog isOpen={true} />
      </ModalVisibilityProvider>,
    )
    expect(screen.getByTestId('open')).toHaveTextContent('true')

    rerender(
      <ModalVisibilityProvider>
        <Probe />
      </ModalVisibilityProvider>,
    )
    expect(screen.getByTestId('open')).toHaveTextContent('false')
  })

  it('stays open while at least one of several dialogs is still open', () => {
    const { rerender } = render(
      <ModalVisibilityProvider>
        <Probe />
        <FakeDialog isOpen={true} />
        <FakeDialog isOpen={true} />
      </ModalVisibilityProvider>,
    )
    expect(screen.getByTestId('open')).toHaveTextContent('true')

    rerender(
      <ModalVisibilityProvider>
        <Probe />
        <FakeDialog isOpen={true} />
        <FakeDialog isOpen={false} />
      </ModalVisibilityProvider>,
    )
    expect(screen.getByTestId('open')).toHaveTextContent('true')

    rerender(
      <ModalVisibilityProvider>
        <Probe />
        <FakeDialog isOpen={false} />
        <FakeDialog isOpen={false} />
      </ModalVisibilityProvider>,
    )
    expect(screen.getByTestId('open')).toHaveTextContent('false')
  })

  it('closes again when a dialog toggles isOpen back to false without unmounting', async () => {
    function ToggleDialog() {
      const [isOpen, setIsOpen] = useState(true)
      useRegisterModalOpen(isOpen)
      return <button onClick={() => setIsOpen(false)}>close</button>
    }

    render(
      <ModalVisibilityProvider>
        <Probe />
        <ToggleDialog />
      </ModalVisibilityProvider>,
    )
    expect(screen.getByTestId('open')).toHaveTextContent('true')

    await userEvent.click(screen.getByRole('button', { name: 'close' }))

    expect(screen.getByTestId('open')).toHaveTextContent('false')
  })

  it('falls back to "no modal open" outside of a provider, without throwing', () => {
    expect(() => render(<Probe />)).not.toThrow()
    expect(screen.getByTestId('open')).toHaveTextContent('false')
  })

  it('does not throw when a dialog registers outside of a provider', async () => {
    expect(() =>
      render(<FakeDialog isOpen={true} />),
    ).not.toThrow()
  })
})
