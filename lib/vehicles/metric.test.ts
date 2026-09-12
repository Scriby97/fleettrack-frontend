import { describe, it, expect } from 'vitest'
import { vehicleUsesKm, counterDecimals } from './metric'

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
