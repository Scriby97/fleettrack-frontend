// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/renderWithIntl'

const router = { push: vi.fn(), refresh: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => router,
}))

const signUp = vi.fn()
vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({ signUp }),
}))

import RegisterPage from './page'

// --- Helfer -----------------------------------------------------------------

const firstNameInput = () => document.getElementById('firstName') as HTMLInputElement
const lastNameInput = () => document.getElementById('lastName') as HTMLInputElement
const emailInput = () => document.getElementById('email') as HTMLInputElement
const passwordInput = () => document.getElementById('password') as HTMLInputElement
const confirmPasswordInput = () => document.getElementById('confirmPassword') as HTMLInputElement
const consentCheckbox = () => document.getElementById('consent') as HTMLInputElement
const submitButton = () => screen.getByRole('button', { name: /Konto erstellen|Bitte warten/ })

async function fillValidFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(firstNameInput(), 'Nico')
  await user.type(lastNameInput(), 'Balmer')
  await user.type(emailInput(), 'nico@example.test')
  await user.type(passwordInput(), 'geheim123')
  await user.type(confirmPasswordInput(), 'geheim123')
}

describe('Registrieren', () => {
  beforeEach(() => {
    router.push.mockReset()
    router.refresh.mockReset()
    signUp.mockReset()
  })

  it('links to AGB and Datenschutzerklärung in the consent label', () => {
    renderWithIntl(<RegisterPage />)

    expect(document.querySelector('a[href="/agb"]')).not.toBeNull()
    expect(document.querySelector('a[href="/datenschutz"]')).not.toBeNull()
  })

  it('blocks the submit with an inline error when consent is not given', async () => {
    const user = userEvent.setup()
    renderWithIntl(<RegisterPage />)
    await fillValidFields(user)

    await user.click(submitButton())

    expect(
      await screen.findByText('Bitte akzeptiere die AGB und die Datenschutzerklärung, um fortzufahren.'),
    ).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('proceeds once consent is checked alongside valid fields', async () => {
    signUp.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderWithIntl(<RegisterPage />)
    await fillValidFields(user)
    await user.click(consentCheckbox())

    await user.click(submitButton())

    expect(signUp).toHaveBeenCalledWith('nico@example.test', 'geheim123', {
      firstName: 'Nico',
      lastName: 'Balmer',
    })
  })
})
