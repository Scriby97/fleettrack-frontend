// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModalPortal } from './ModalPortal'

describe('ModalPortal', () => {
  it('renders its children as a direct child of document.body, not of the render container', () => {
    const { container } = render(
      <ModalPortal>
        <div data-testid="portaled">Hallo</div>
      </ModalPortal>,
    )

    const portaled = screen.getByTestId('portaled')
    expect(portaled.parentElement).toBe(document.body)
    expect(container).toBeEmptyDOMElement()
  })
})
