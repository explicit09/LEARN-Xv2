import { describe, expect, it } from 'vitest'

import { formatDate, formatRelative } from '../date'

describe('formatDate', () => {
  it('formats a date as MMM d, yyyy', () => {
    expect(formatDate(new Date('2024-01-15T12:00:00Z'))).toBe('Jan 15, 2024')
  })

  it('handles end of year', () => {
    expect(formatDate(new Date('2024-12-31T12:00:00Z'))).toBe('Dec 31, 2024')
  })
})

describe('formatRelative', () => {
  it('returns a non-empty string for a past date', () => {
    const past = new Date(Date.now() - 60_000) // 1 minute ago
    const result = formatRelative(past)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for a future date', () => {
    const future = new Date(Date.now() + 60_000 * 60 * 24) // 1 day from now
    const result = formatRelative(future)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns "less than a minute ago" for very recent dates', () => {
    const now = new Date()
    const result = formatRelative(now)
    expect(result).toContain('minute')
  })
})
