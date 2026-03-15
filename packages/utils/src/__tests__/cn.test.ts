import { describe, expect, it } from 'vitest'

import { cn } from '../cn'

describe('cn', () => {
  it('joins simple class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles undefined and null gracefully', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('merges conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge: p-4 and p-2 conflict — last one wins
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('merges conflicting text color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })

  it('handles object syntax', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })
})
