import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultRangeEnd, defaultRangeStart, toDatetimeLocalValue } from './rangeDefaults'

describe('toDatetimeLocalValue', () => {
  it('formats local time without seconds or timezone suffix', () => {
    expect(toDatetimeLocalValue(new Date(2026, 8, 5, 7, 3))).toBe('2026-09-05T07:03')
  })

  it('zero-pads month, day, hour and minute', () => {
    expect(toDatetimeLocalValue(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02T00:00')
  })
})

describe('default range', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ends now and starts exactly one year earlier', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 21, 14, 30))

    expect(defaultRangeEnd()).toBe('2026-09-21T14:30')
    expect(defaultRangeStart()).toBe('2025-09-21T14:30')
  })
})
