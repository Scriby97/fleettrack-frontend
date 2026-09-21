import { describe, expect, it } from 'vitest'
import de from '../messages/de.json'
import en from '../messages/en.json'
import fr from '../messages/fr.json'
import it_ from '../messages/it.json'

const locales = { de, en, fr, it: it_ } as const

// Tarifnamen sind Raenge - je Sprache uebersetzt, damit z.B. die deutsche
// Oberflaeche nicht "Captain" schreibt, waehrend der Rest Deutsch ist.
const EXPECTED = {
  de: { lieutenant: 'Leutnant', captain: 'Hauptmann', general: 'General' },
  en: { lieutenant: 'Lieutenant', captain: 'Captain', general: 'General' },
  fr: { lieutenant: 'Lieutenant', captain: 'Capitaine', general: 'Général' },
  it: { lieutenant: 'Tenente', captain: 'Capitano', general: 'Generale' },
} as const

const USER_MANAGEMENT = {
  de: 'Benutzerverwaltung',
  en: 'User Management',
  fr: 'Gestion des utilisateurs',
  it: 'Gestione utenti',
} as const

type Locale = keyof typeof locales
const codes = Object.keys(locales) as Locale[]

describe('subscription tier names', () => {
  it.each(codes)('%s names all three tiers', (code) => {
    expect(locales[code].subscriptionTiers).toEqual(EXPECTED[code])
  })

  it.each(codes)('%s uses three different names', (code) => {
    const names = Object.values(locales[code].subscriptionTiers)
    expect(new Set(names).size).toBe(3)
  })

  it.each(codes)('%s uses the tier name in the texts about the free plan', (code) => {
    const { lieutenant } = locales[code].subscriptionTiers
    const billing = locales[code].settingsBilling

    expect(billing.cancelSuccessNotice).toContain(lieutenant)
    expect(billing.cancelConfirmMessage).toContain(lieutenant)
    expect(billing.cancelConfirmOverLimitMessage).toContain(lieutenant)
    expect(locales[code].onboardingCreateOrg.canceledMessage).toContain(lieutenant)
  })

  it.each(codes)('%s lists all three tier names when choosing a plan', (code) => {
    const text = locales[code].onboarding.createOrgDescription

    for (const name of Object.values(locales[code].subscriptionTiers)) {
      expect(text).toContain(name)
    }
  })

  it.each(['de', 'it'] as const)(
    '%s no longer shows the English tier names Lieutenant and Captain',
    (code) => {
      const json = JSON.stringify(locales[code])

      expect(json).not.toMatch(/\bLieutenant\b/)
      expect(json).not.toMatch(/\bCaptain\b/)
    },
  )

  it('it no longer shows the English name General', () => {
    expect(JSON.stringify(locales.it)).not.toMatch(/\bGeneral\b/)
  })

  it('fr no longer shows the English tier names Captain and General', () => {
    const json = JSON.stringify(locales.fr)

    expect(json).not.toMatch(/\bCaptain\b/)
    expect(json).not.toMatch(/\bGeneral\b/)
  })
})

describe('user management title', () => {
  it.each(codes)('%s uses the localized name in the settings tile and on the page', (code) => {
    expect(locales[code].settings.userManagementTitle).toBe(USER_MANAGEMENT[code])
    expect(locales[code].userManagement.title).toBe(USER_MANAGEMENT[code])
  })

  it.each(['de', 'fr', 'it'] as const)('%s does not show the English name', (code) => {
    expect(JSON.stringify(locales[code])).not.toContain('User Management')
  })
})
