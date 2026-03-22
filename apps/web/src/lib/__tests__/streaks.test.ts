import { describe, it, expect } from 'vitest'
import { computeStreak } from '../streaks'

function daysAgo(n: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]!
}

describe('computeStreak', () => {
  const today = new Date('2026-03-21T10:00:00')

  it('returns 0 when no plans exist', () => {
    const result = computeStreak([], today)
    expect(result.currentStreak).toBe(0)
  })

  it('counts consecutive days from today', () => {
    const plans = [
      { date: daysAgo(0, today), hasCompletion: true },
      { date: daysAgo(1, today), hasCompletion: true },
      { date: daysAgo(2, today), hasCompletion: true },
    ]
    const result = computeStreak(plans, today)
    expect(result.currentStreak).toBe(3)
  })

  it('breaks on a gap day', () => {
    const plans = [
      { date: daysAgo(0, today), hasCompletion: true },
      { date: daysAgo(1, today), hasCompletion: true },
      // day 2 missing
      { date: daysAgo(3, today), hasCompletion: true },
    ]
    const result = computeStreak(plans, today)
    expect(result.currentStreak).toBe(2)
  })

  it('returns 0 when today has no plan (streak not started)', () => {
    const plans = [
      { date: daysAgo(1, today), hasCompletion: true },
      { date: daysAgo(2, today), hasCompletion: true },
    ]
    const result = computeStreak(plans, today)
    expect(result.currentStreak).toBe(0)
  })

  it('counts streak starting from yesterday if today has no plan yet', () => {
    // Allow "yesterday counts" mode — user hasn't opened the app yet today
    // but their streak from yesterday should still show
    const plans = [
      { date: daysAgo(1, today), hasCompletion: true },
      { date: daysAgo(2, today), hasCompletion: true },
      { date: daysAgo(3, today), hasCompletion: true },
    ]
    const result = computeStreak(plans, today, { allowYesterdayStart: true })
    expect(result.currentStreak).toBe(3)
  })

  it('requires completion when requireCompletion is true', () => {
    const plans = [
      { date: daysAgo(0, today), hasCompletion: true },
      { date: daysAgo(1, today), hasCompletion: false }, // plan exists but nothing done
      { date: daysAgo(2, today), hasCompletion: true },
    ]
    const result = computeStreak(plans, today, { requireCompletion: true })
    expect(result.currentStreak).toBe(1)
  })

  it('ignores completion flag when requireCompletion is false', () => {
    const plans = [
      { date: daysAgo(0, today), hasCompletion: false },
      { date: daysAgo(1, today), hasCompletion: false },
    ]
    const result = computeStreak(plans, today, { requireCompletion: false })
    expect(result.currentStreak).toBe(2)
  })

  it('handles single-day streak', () => {
    const plans = [{ date: daysAgo(0, today), hasCompletion: true }]
    const result = computeStreak(plans, today)
    expect(result.currentStreak).toBe(1)
  })

  it('handles dates near midnight without timezone drift', () => {
    // Simulate server at near-midnight: 2026-03-21T23:59:00
    const lateToday = new Date('2026-03-21T23:59:00')
    const plans = [
      { date: '2026-03-21', hasCompletion: true },
      { date: '2026-03-20', hasCompletion: true },
    ]
    const result = computeStreak(plans, lateToday)
    expect(result.currentStreak).toBe(2)
  })

  it('handles unordered input by sorting desc', () => {
    const plans = [
      { date: daysAgo(2, today), hasCompletion: true },
      { date: daysAgo(0, today), hasCompletion: true },
      { date: daysAgo(1, today), hasCompletion: true },
    ]
    const result = computeStreak(plans, today)
    expect(result.currentStreak).toBe(3)
  })
})
