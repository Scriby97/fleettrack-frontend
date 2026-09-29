import { describe, it, expect } from 'vitest'
import { vehicleUsesKm, counterDecimals, decimalPlaces } from './metric'

describe('vehicleUsesKm', () => {
  it('is false for Pistenfahrzeug (reports operating hours)', () => {
    expect(vehicleUsesKm('Pistenfahrzeug')).toBe(false)
  })

  it('is true for Quad, Skidoo and Transporter', () => {
    expect(vehicleUsesKm('Quad')).toBe(true)
    expect(vehicleUsesKm('Skidoo')).toBe(true)
    expect(vehicleUsesKm('Transporter')).toBe(true)
  })

  it('is true when the vehicle has no type set', () => {
    expect(vehicleUsesKm(undefined)).toBe(true)
    expect(vehicleUsesKm(null)).toBe(true)
    expect(vehicleUsesKm('')).toBe(true)
  })

  it('is not fooled by surrounding whitespace', () => {
    expect(vehicleUsesKm('  Pistenfahrzeug  ')).toBe(false)
  })
})

describe('counterDecimals', () => {
  it('shows no decimals for km', () => {
    expect(counterDecimals(true)).toBe(0)
  })

  it('shows one decimal for hours', () => {
    expect(counterDecimals(false)).toBe(1)
  })
})

describe('decimalPlaces', () => {
  it('is 0 for a whole number', () => {
    expect(decimalPlaces('3376')).toBe(0)
  })

  it('counts the digits after the decimal point', () => {
    expect(decimalPlaces('3380.4')).toBe(1)
    expect(decimalPlaces('105.69')).toBe(2)
    expect(decimalPlaces('3380.4654')).toBe(4)
  })

  it('is 0 for an empty string', () => {
    expect(decimalPlaces('')).toBe(0)
  })

  it('does not miscount a trailing dot with nothing after it', () => {
    expect(decimalPlaces('3380.')).toBe(0)
  })
})
