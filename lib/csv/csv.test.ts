import { describe, it, expect } from 'vitest'
import { csvCell, csvRow } from './csv'

describe('csvCell', () => {
  it('returns plain values unchanged', () => {
    expect(csvCell('Transporter A')).toBe('Transporter A')
  })

  it('quotes a value containing a comma', () => {
    expect(csvCell('Nord, Halle 2')).toBe('"Nord, Halle 2"')
  })

  it('quotes a value containing a newline', () => {
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('quotes and doubles embedded quotes', () => {
    expect(csvCell('Quad "Gelb"')).toBe('"Quad ""Gelb"""')
  })
})

describe('csvRow', () => {
  it('joins cells with a comma', () => {
    expect(csvRow(['a', 'b', 'c'])).toBe('a,b,c')
  })

  it('stringifies numbers', () => {
    expect(csvRow(['Fahrzeug', 12.3, 0])).toBe('Fahrzeug,12.3,0')
  })

  it('escapes only the cells that need it', () => {
    expect(csvRow(['Pistenfahrzeug "Nord", Halle 2', 'BE 123456'])).toBe(
      '"Pistenfahrzeug ""Nord"", Halle 2",BE 123456',
    )
  })

  it('leaves empty strings empty (no quoting needed)', () => {
    expect(csvRow(['a', '', 'c'])).toBe('a,,c')
  })
})
